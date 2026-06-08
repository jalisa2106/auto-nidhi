from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Customer, SystemUser
from backend.utils import get_current_customer, get_customer_for_user

router = APIRouter(prefix="/api/v1/customer", tags=["Customer Dashboard"])


def _rows(db: Session, sql: str, params: dict | None = None):
    return [dict(row) for row in db.execute(text(sql), params or {}).mappings().all()]


@router.get("/dashboard")
def customer_dashboard(
    current_user: SystemUser = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    user_id = str(current_user.id)
    customer = get_customer_for_user(current_user, db)

    if not customer:
        return {
            "user": {
                "id": user_id,
                "first_name": current_user.first_name,
                "last_name": current_user.last_name,
                "email": current_user.email,
                "role_id": str(current_user.role_id) if current_user.role_id else None,
            },
            "dashboard": {
                "total_files": 0,
                "completed_files": 0,
                "recent_files": [],
            },
        }

    customer_id = str(customer.id)

    total_files = db.execute(
        text(
            "SELECT COUNT(*) FROM file_record WHERE customer_id = :customer_id AND is_deleted = FALSE"
        ),
        {"customer_id": customer_id},
    ).scalar() or 0

    completed_files = db.execute(
        text(
            """
            SELECT COUNT(*)
            FROM file_record
            WHERE customer_id = :customer_id
              AND is_deleted = FALSE
              AND LOWER(status::text) = 'completed'
            """
        ),
        {"customer_id": customer_id},
    ).scalar() or 0

    recent_files = _rows(
        db,
        """
        SELECT
            fr.id::text AS id,
            fr.file_number,
            fr.file_type::text AS file_type,
            fr.status::text AS status,
            COALESCE(bank.bank_name, '') AS finance_bank,
            fr.created_at
        FROM file_record
        AS fr
        LEFT JOIN finance_info AS fi ON fi.file_id = fr.id
        LEFT JOIN master_bank AS bank ON bank.id = fi.bank_id
        WHERE fr.is_deleted = FALSE
          AND fr.customer_id = :customer_id
        ORDER BY fr.created_at DESC
        LIMIT 5
        """,
        {"customer_id": customer_id},
    )

    allocated_staff = db.execute(
        text("""
        SELECT su.first_name, su.last_name, su.email,
               csa.allocated_since
        FROM customer_staff_allocation csa
        JOIN system_user su ON su.id = csa.staff_id
        WHERE csa.customer_id = :customer_id
        AND csa.is_active = TRUE
        ORDER BY csa.allocated_since DESC
        LIMIT 1
        """),
        {"customer_id": customer_id}
    ).mappings().first()

    return {
        "user": {
            "id": user_id,
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "email": current_user.email,
            "role_id": str(current_user.role_id) if current_user.role_id else None,
        },
        "dashboard": {
            "total_files": total_files,
            "completed_files": completed_files,
            "recent_files": recent_files,
            "allocated_staff": {
                "name": f"{allocated_staff['first_name']} {allocated_staff['last_name'] or ''}".strip(),
                "email": allocated_staff["email"],
                "since": allocated_staff["allocated_since"].isoformat() if allocated_staff["allocated_since"] else None,
            } if allocated_staff else None,
        },
    }


@router.get("/action-required")
def customer_action_required(
    current_user: SystemUser = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    customer = get_customer_for_user(current_user, db)
    if not customer:
        return {
            "outstanding_payments": 0,
            "pending_documents": 0,
            "expiring_insurance_days": None,
            "expiring_insurance_file": None,
            "files_needing_attention": [],
        }

    customer_id = str(customer.id)

    outstanding_payments = db.execute(
        text(
            """
            SELECT COUNT(*)
            FROM payment_in pi
            JOIN file_record fr ON fr.id = pi.file_id
            WHERE fr.customer_id = :cid
              AND fr.is_deleted = FALSE
              AND pi.remaining_amount > 0
            """
        ),
        {"cid": customer_id},
    ).scalar() or 0

    pending_documents = db.execute(
        text(
            """
            SELECT COUNT(*)
            FROM customer_document
            WHERE customer_id = :cid
              AND status IN ('pending', 'rejected')
            """
        ),
        {"cid": customer_id},
    ).scalar() or 0

    expiry = db.execute(
        text(
            """
            SELECT fr.file_number,
                   ii.valid_to,
                   (ii.valid_to::date - CURRENT_DATE) AS days_left
            FROM insurance_info ii
            JOIN file_record fr ON fr.id = ii.file_id
            WHERE fr.customer_id = :cid
              AND fr.is_deleted = FALSE
              AND ii.valid_to IS NOT NULL
              AND ii.valid_to::date >= CURRENT_DATE
            ORDER BY ii.valid_to ASC
            LIMIT 1
            """
        ),
        {"cid": customer_id},
    ).mappings().first()

    stale_files = [
        dict(row)
        for row in db.execute(
            text(
                """
                SELECT file_number,
                       status::text AS status,
                       (CURRENT_DATE - created_at::date) AS days_old
                FROM file_record
                WHERE customer_id = :cid
                  AND is_deleted = FALSE
                  AND status = 'draft'
                  AND created_at < NOW() - INTERVAL '7 days'
                """
            ),
            {"cid": customer_id},
        ).mappings().all()
    ]

    return {
        "outstanding_payments": int(outstanding_payments),
        "pending_documents": int(pending_documents),
        "expiring_insurance_days": int(expiry["days_left"]) if expiry else None,
        "expiring_insurance_file": expiry["file_number"] if expiry else None,
        "files_needing_attention": stale_files,
    }
