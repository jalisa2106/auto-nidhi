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
        },
    }
