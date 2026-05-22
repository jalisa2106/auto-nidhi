from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db
from backend.models import SystemUser
from backend.utils import get_current_admin

router = APIRouter(prefix="/api/v1/dashboard", tags=["Admin Dashboard"])


@router.get("/")
def get_admin_dashboard(
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin)
):
    total_users = db.query(func.count(SystemUser.id)).scalar()

    active_users = (
        db.query(func.count(SystemUser.id))
        .filter(SystemUser.is_active == True)
        .scalar()
    )

    inactive_users = (
        db.query(func.count(SystemUser.id))
        .filter(SystemUser.is_active == False)
        .scalar()
    )

    return {
        "message": "Admin dashboard data fetched successfully",
        "stats": {
            "total_users": total_users,
            "active_users": active_users,
            "inactive_users": inactive_users,
        },
        "admin": {
            "id": str(current_admin.id),
            "name": current_admin.first_name,
            "email": current_admin.email,
        }
    }