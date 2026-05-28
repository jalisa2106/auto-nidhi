from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import SystemUser
from backend.utils import get_current_customer

router = APIRouter(prefix="/api/v1/customer", tags=["Customer Dashboard"])


def _rows(db: Session, sql: str, params: dict | None = None):
    return [dict(row) for row in db.execute(text(sql), params or {}).mappings().all()]


@router.get("/dashboard")
def customer_dashboard(
    current_user: SystemUser = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    user_id = str(current_user.id)

    total_files_created = db.execute(
        text(
            "SELECT COUNT(*) FROM file_record WHERE created_by_user_id = :user_id AND is_deleted = FALSE"
        ),
        {"user_id": user_id},
    ).scalar() or 0

    total_files_assigned = db.execute(
        text(
            "SELECT COUNT(*) FROM file_record WHERE assigned_to = :user_id AND is_deleted = FALSE"
        ),
        {"user_id": user_id},
    ).scalar() or 0

    recent_files = _rows(
        db,
        """
        SELECT
            id::text AS id,
            file_number,
            file_type::text AS type,
            status::text AS status,
            COALESCE(assigned.first_name, '') AS assigned_to,
            created_at
        FROM file_record
        LEFT JOIN system_user AS assigned ON assigned.id = file_record.assigned_to
        WHERE is_deleted = FALSE
        AND (created_by_user_id = :user_id OR assigned_to = :user_id)
        ORDER BY created_at DESC
        LIMIT 5
        """,
        {"user_id": user_id},
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
            "total_files_created": total_files_created,
            "total_files_assigned": total_files_assigned,
            "recent_files": recent_files,
        },
    }
