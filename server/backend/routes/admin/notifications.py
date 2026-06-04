from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
import datetime
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID

from backend.database import get_db
from backend.models import Notification, SystemUser, MasterRole
from backend.utils import get_current_user 

class NotifyAdminSchema(BaseModel):
    subject: str
    message: str
    page_context: str
    admin_ids: Optional[List[UUID]] = None
    summary: Optional[dict] = None

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])

@router.get("/")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: SystemUser = Depends(get_current_user)
):
    # 1. AUTO-DELETE LOGIC: Clean up read notifications older than 3 days
    three_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=3)
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == True,
        Notification.read_at <= three_days_ago
    ).delete(synchronize_session=False)
    db.commit()

    # 2. Fetch the remaining notifications
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).all()
    
    return {
        "data": [
            {
                "id": str(n.id),
                "type": n.notification_type,
                "message": n.message,
                "read": n.is_read,
                "created_at": n.created_at.isoformat() if hasattr(n.created_at, "isoformat") else str(n.created_at) if n.created_at else None,
                "file_id": str(n.file_id) if n.file_id else None
            } for n in notifications
        ]
    }

@router.patch("/{notification_id}/read")
def mark_as_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: SystemUser = Depends(get_current_user)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif.is_read = True
    notif.read_at = func.now() # Record exact time it was read
    db.commit()
    return {"status": "success"}

@router.patch("/mark-all-read")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: SystemUser = Depends(get_current_user)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({
        "is_read": True, 
        "read_at": func.now() # Record exact time they were read
    })
    
    db.commit()
    return {"status": "success"}

@router.post("/notify-admin")
def notify_admin(
    payload: NotifyAdminSchema,
    db: Session = Depends(get_db),
    current_user: SystemUser = Depends(get_current_user),
):
    # 1. Get all active targeted admin users (or target specific admin_ids if passed)
    if payload.admin_ids:
        admins = db.query(SystemUser).filter(
            SystemUser.id.in_(payload.admin_ids),
            SystemUser.is_active == True
        ).all()
    else:
        admin_role = db.query(MasterRole).filter(MasterRole.role_name.ilike("admin")).first()
        if not admin_role:
            raise HTTPException(status_code=404, detail="Admin role not found")
        admins = db.query(SystemUser).filter(
            SystemUser.role_id == admin_role.id,
            SystemUser.is_active == True
        ).all()

    sender_name = f"{current_user.first_name} {current_user.last_name or ''}".strip() or current_user.email
    
    # 2. Build the final message including summary if present
    summary_text = ""
    if payload.summary:
        summary_text = "\n\n--- Summary ---\n" + "\n".join(
            f"{k.replace('_', ' ').title()}: {v}" for k, v in payload.summary.items()
        )
    
    full_message = f"📊 [{payload.page_context}] {payload.subject}\nFrom: {sender_name}\n\n{payload.message}{summary_text}"

    # 3. Add a Notification record for each targeted admin user
    for admin in admins:
        db.add(Notification(
            user_id=admin.id,
            notification_type="general",
            message=full_message
        ))

    try:
        db.commit()
        return {"status": "success", "notified_count": len(admins)}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))