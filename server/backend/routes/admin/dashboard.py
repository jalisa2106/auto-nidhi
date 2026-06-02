from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.database import get_db
from backend.models import SystemUser
from backend.utils import get_current_admin

router = APIRouter(prefix="/api/v1/dashboard", tags=["Admin Dashboard"])


def _scalar(db: Session, sql: str, params: dict | None = None, default=0):
    value = db.execute(text(sql), params or {}).scalar()
    return default if value is None else value


def _rows(db: Session, sql: str, params: dict | None = None):
    return [dict(row) for row in db.execute(text(sql), params or {}).mappings().all()]


def _admin_payload(current_admin: SystemUser):
    return {
        "id": str(current_admin.id),
        "name": current_admin.first_name,
        "email": current_admin.email,
    }


def _get_stats(db: Session):
    return db.execute(
        text(
            """
            WITH file_counts AS (
                SELECT
                    COUNT(*) AS total_files,
                    COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled')) AS active_files,
                    COUNT(*) FILTER (WHERE status = 'completed') AS completed_files,
                    COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_files,
                    COUNT(*) FILTER (WHERE file_type = 'new_vehicle' AND status NOT IN ('completed', 'cancelled')) AS new_files,
                    COUNT(*) FILTER (WHERE file_type = 'used_vehicle' AND status NOT IN ('completed', 'cancelled')) AS used_files,
                    COUNT(*) FILTER (WHERE file_type = 'renewal' AND status NOT IN ('completed', 'cancelled')) AS renewal_files
                FROM file_record
                WHERE is_deleted = FALSE
            ),
            customer_counts AS (
                SELECT COUNT(*) AS total_customers FROM customer
            ),
            user_counts AS (
                SELECT
                    COUNT(*) AS total_users,
                    COUNT(*) FILTER (WHERE is_active = TRUE) AS active_users,
                    COUNT(*) FILTER (WHERE is_active = FALSE) AS inactive_users,
                    COUNT(*) FILTER (
                        WHERE is_active = TRUE
                        AND COALESCE(LOWER(mr.role_name), '') <> 'admin'
                    ) AS active_staff
                FROM system_user su
                LEFT JOIN master_role mr ON mr.id = su.role_id
            )
            SELECT *
            FROM file_counts, customer_counts, user_counts
            """
        )
    ).mappings().first()


def _get_pipeline(db: Session):
    return _rows(
        db,
        """
        SELECT
            status::text AS status,
            CASE status::text
                WHEN 'draft' THEN 'Draft'
                WHEN 'login' THEN 'Login'
                WHEN 'under_process' THEN 'Under Process'
                WHEN 'sanctioned' THEN 'Sanctioned'
                WHEN 'disbursed' THEN 'Disbursed'
                WHEN 'completed' THEN 'Completed'
                WHEN 'cancelled' THEN 'Cancelled'
                ELSE status::text
            END AS label,
            COUNT(*) AS count
        FROM file_record
        WHERE is_deleted = FALSE
        AND status IN ('draft', 'login', 'under_process', 'sanctioned', 'disbursed')
        GROUP BY status
        ORDER BY CASE status::text
            WHEN 'draft' THEN 1
            WHEN 'login' THEN 2
            WHEN 'under_process' THEN 3
            WHEN 'sanctioned' THEN 4
            WHEN 'disbursed' THEN 5
            ELSE 99
        END
        """,
    )


def _get_recent_files(db: Session, limit: int = 5):
    return _rows(
        db,
        """
        SELECT
            f.id::text AS id,
            f.file_number,
            COALESCE(f.file_number, f.id::text) AS display_id,
            c.full_name AS customer,
            f.file_type::text AS type,
            CASE f.file_type::text
                WHEN 'new_vehicle' THEN 'New Vehicle'
                WHEN 'used_vehicle' THEN 'Used Vehicle'
                WHEN 'renewal' THEN 'Renewal'
                ELSE f.file_type::text
            END AS type_label,
            f.status::text AS status,
            CASE f.status::text
                WHEN 'draft' THEN 'Draft'
                WHEN 'login' THEN 'Login'
                WHEN 'under_process' THEN 'Under Process'
                WHEN 'sanctioned' THEN 'Sanctioned'
                WHEN 'disbursed' THEN 'Disbursed'
                WHEN 'completed' THEN 'Completed'
                WHEN 'cancelled' THEN 'Cancelled'
                ELSE f.status::text
            END AS status_label,
            COALESCE(assigned.first_name, '') AS assigned,
            f.created_at
        FROM file_record f
        JOIN customer c ON c.id = f.customer_id
        LEFT JOIN system_user assigned ON assigned.id = f.assigned_to
        WHERE f.is_deleted = FALSE
        ORDER BY f.created_at DESC
        LIMIT :limit
        """,
        {"limit": limit},
    )


def _get_financials(db: Session):
    return db.execute(
        text(
            """
            WITH bounds AS (
                SELECT
                    DATE_TRUNC('month', CURRENT_DATE)::date AS month_start,
                    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::date AS next_month_start
            ),
            payment_in_mtd AS (
                SELECT
                    COALESCE(SUM(payment_amount), 0) AS total,
                    COUNT(*) AS transactions
                FROM payment_in, bounds
                WHERE payment_date >= bounds.month_start
                AND payment_date < bounds.next_month_start
            ),
            payment_out_mtd AS (
                SELECT
                    COALESCE(SUM(amount), 0) AS total,
                    COUNT(*) AS transactions
                FROM payment_out, bounds
                WHERE payment_date >= bounds.month_start
                AND payment_date < bounds.next_month_start
            ),
            commission_in_mtd AS (
                SELECT
                    COALESCE(SUM(amount), 0) AS total,
                    COUNT(*) AS transactions
                FROM commission_in, bounds
                WHERE payment_date >= bounds.month_start
                AND payment_date < bounds.next_month_start
            ),
            commission_out_mtd AS (
                SELECT
                    COALESCE(SUM(amount), 0) AS total,
                    COUNT(*) AS transactions
                FROM commission_out, bounds
                WHERE payment_date >= bounds.month_start
                AND payment_date < bounds.next_month_start
            )
            SELECT
                payment_in_mtd.total AS payment_in,
                payment_in_mtd.transactions AS payment_in_transactions,
                payment_out_mtd.total AS payment_out,
                payment_out_mtd.transactions AS payment_out_transactions,
                commission_in_mtd.total AS commission_in,
                commission_in_mtd.transactions AS commission_in_transactions,
                commission_out_mtd.total AS commission_out,
                commission_out_mtd.transactions AS commission_out_transactions,
                (
                    payment_in_mtd.total
                    + commission_in_mtd.total
                    - payment_out_mtd.total
                    - commission_out_mtd.total
                ) AS net_position
            FROM payment_in_mtd, payment_out_mtd, commission_in_mtd, commission_out_mtd
            """
        )
    ).mappings().first()


def _get_insurance_expiring(db: Session, days: int = 7):
    return _rows(
        db,
        """
        WITH expiring_policies AS (
            SELECT
                f.id AS file_id,
                f.file_number,
                c.full_name AS customer,
                ii.policy_number AS policy,
                mit.insurance_type_name AS insurance_type,
                ii.valid_to AS expires_on
            FROM file_record f
            JOIN customer c ON c.id = f.customer_id
            JOIN insurance_info ii ON ii.file_id = f.id
            LEFT JOIN master_insurance_type mit ON mit.id = ii.insurance_type_id
            WHERE f.is_deleted = FALSE
            AND ii.valid_to IS NOT NULL

            UNION ALL

            SELECT
                f.id AS file_id,
                f.file_number,
                c.full_name AS customer,
                NULL AS policy,
                mic.company_name AS insurance_type,
                ip.valid_to AS expires_on
            FROM insurance_payment ip
            JOIN file_record f ON f.id = ip.file_id
            JOIN customer c ON c.id = f.customer_id
            LEFT JOIN master_insurance_company mic ON mic.id = ip.insurance_company_id
            WHERE f.is_deleted = FALSE
            AND ip.is_deleted = FALSE
            AND ip.valid_to IS NOT NULL
        )
        SELECT
            file_id::text AS file_id,
            file_number,
            COALESCE(file_number, file_id::text) AS file,
            customer,
            policy,
            insurance_type,
            expires_on,
            (expires_on - CURRENT_DATE) AS expires_in,
            CONCAT((expires_on - CURRENT_DATE), ' days') AS days_label
        FROM expiring_policies
        WHERE expires_on >= CURRENT_DATE
        AND expires_on <= CURRENT_DATE + (:days * INTERVAL '1 day')
        ORDER BY expires_on ASC
        LIMIT 10
        """,
        {"days": days},
    )


def _get_notifications(db: Session, current_admin: SystemUser, limit: int = 5):
    rows = _rows(
        db,
        """
        SELECT
            id::text,
            notification_type::text AS type,
            message,
            file_id::text,
            is_read AS read,
            created_at
        FROM notifications
        WHERE user_id = :user_id
        ORDER BY created_at DESC
        LIMIT :limit
        """,
        {"user_id": str(current_admin.id), "limit": limit},
    )

    unread_count = _scalar(
        db,
        "SELECT COUNT(*) FROM notifications WHERE user_id = :user_id AND is_read = FALSE",
        {"user_id": str(current_admin.id)},
    )

    return {"items": rows, "unread_count": unread_count}


def _get_activity(db: Session, limit: int = 7):
    return _rows(
        db,
        """
        SELECT
            al.id::text,
            COALESCE(su.first_name, 'System') AS user,
            al.action,
            al.table_name,
            al.record_id::text,
            al.created_at
        FROM audit_logs al
        LEFT JOIN system_user su ON su.id = al.user_id
        ORDER BY al.created_at DESC
        LIMIT :limit
        """,
        {"limit": limit},
    )


def _get_extended_stats(db: Session):
    """Expenses MTD, RTO MTD, Advances outstanding, Loans summary."""
    return db.execute(
        text(
            """
            WITH bounds AS (
                SELECT
                    DATE_TRUNC('month', CURRENT_DATE)::date AS month_start,
                    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::date AS next_month_start
            ),
            expenses_mtd AS (
                SELECT
                    COALESCE(SUM(amount), 0) AS total,
                    COUNT(*) AS transactions
                FROM expense_ledger, bounds
                WHERE expense_date >= bounds.month_start
                AND expense_date < bounds.next_month_start
                AND is_deleted = FALSE
            ),
            rto_mtd AS (
                SELECT
                    COALESCE(SUM(rp.amount), 0) AS total,
                    COUNT(*) AS transactions
                FROM rto_payment rp, bounds
                WHERE rp.payment_date >= bounds.month_start
                AND rp.payment_date < bounds.next_month_start
                AND rp.is_deleted = FALSE
            ),
            advances_summary AS (
                SELECT
                    COALESCE(SUM(amount), 0) AS total_advanced,
                    COALESCE(SUM(amount_recovered), 0) AS total_recovered,
                    COALESCE(SUM(amount - amount_recovered), 0) AS outstanding,
                    COUNT(*) FILTER (WHERE recovery_status = 'pending') AS pending_count
                FROM advances
                WHERE is_deleted = FALSE
            ),
            loans_summary AS (
                SELECT
                    COUNT(fi.id) AS total_loans,
                    COALESCE(SUM(fi.loan_amount), 0) AS total_loan_amount,
                    COUNT(fi.id) FILTER (WHERE fr.status = 'disbursed') AS running_loans
                FROM finance_info fi
                JOIN file_record fr ON fr.id = fi.file_id
                WHERE fr.is_deleted = FALSE
            ),
            insurance_mtd AS (
                SELECT
                    COALESCE(SUM(amount), 0) AS total,
                    COUNT(*) AS transactions
                FROM insurance_payment, bounds
                WHERE payment_date >= bounds.month_start
                AND payment_date < bounds.next_month_start
                AND is_deleted = FALSE
            )
            SELECT
                expenses_mtd.total AS expenses_mtd,
                expenses_mtd.transactions AS expenses_transactions,
                rto_mtd.total AS rto_mtd,
                rto_mtd.transactions AS rto_transactions,
                advances_summary.total_advanced,
                advances_summary.total_recovered,
                advances_summary.outstanding AS advances_outstanding,
                advances_summary.pending_count AS advances_pending_count,
                loans_summary.total_loans,
                loans_summary.total_loan_amount,
                loans_summary.running_loans,
                insurance_mtd.total AS insurance_payments_mtd,
                insurance_mtd.transactions AS insurance_transactions
            FROM expenses_mtd, rto_mtd, advances_summary, loans_summary, insurance_mtd
            """
        )
    ).mappings().first()


def _build_dashboard(db: Session, current_admin: SystemUser):
    stats = dict(_get_stats(db))
    financials = dict(_get_financials(db))
    notifications = _get_notifications(db, current_admin)
    extended_raw = _get_extended_stats(db)
    extended = dict(extended_raw) if extended_raw else {}

    return {
        "message": "Admin dashboard data fetched successfully",
        "admin": _admin_payload(current_admin),
        "stats": stats,
        "financials": financials,
        "extended": extended,
        "pipeline": _get_pipeline(db),
        "recent_files": _get_recent_files(db),
        "insurance_expiring": _get_insurance_expiring(db),
        "notifications": notifications["items"],
        "unread_notifications": notifications["unread_count"],
        "activity": _get_activity(db),
    }


@router.get("/")
@router.get("/stats")
def get_admin_dashboard(
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    return _build_dashboard(db, current_admin)


@router.get("/pipeline")
def get_dashboard_pipeline(
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    return {"pipeline": _get_pipeline(db), "admin": _admin_payload(current_admin)}


@router.get("/recent-files")
def get_dashboard_recent_files(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    return {
        "recent_files": _get_recent_files(db, limit),
        "admin": _admin_payload(current_admin),
    }


@router.get("/financials")
def get_dashboard_financials(
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    return {
        "financials": dict(_get_financials(db)),
        "admin": _admin_payload(current_admin),
    }


@router.get("/insurance-expiring")
def get_dashboard_insurance_expiring(
    days: int = 7,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    return {
        "insurance_expiring": _get_insurance_expiring(db, days),
        "admin": _admin_payload(current_admin),
    }


@router.get("/notifications")
def get_dashboard_notifications(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    notifications = _get_notifications(db, current_admin, limit)
    return {
        "notifications": notifications["items"],
        "unread_notifications": notifications["unread_count"],
        "admin": _admin_payload(current_admin),
    }


@router.get("/activity")
def get_dashboard_activity(
    limit: int = 7,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    return {"activity": _get_activity(db, limit), "admin": _admin_payload(current_admin)}
