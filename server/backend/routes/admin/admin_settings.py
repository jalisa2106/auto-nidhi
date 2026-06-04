import jwt
import os
from datetime import datetime, timezone
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import UserNotificationPreference, SystemUser, MasterRole
from backend.utils import get_current_staff, get_current_admin, record_dashboard_event

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-secret-key")
ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

router = APIRouter(prefix="/api/v1/admin/settings", tags=["Admin Settings"])

DEFAULT_PREFS = {
    "added": True,
    "deleted": True,
    "updated": True,
    "info": True,
    "error": True,
}


class NotificationPreferencesUpdate(BaseModel):
    preferences: Dict[str, bool]

def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/notification-preferences")
def get_notification_preferences(
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_staff),
):
    rows = db.query(UserNotificationPreference).filter(
        UserNotificationPreference.user_id == current_admin.id
    ).all()

    result = DEFAULT_PREFS.copy()
    for row in rows:
        result[row.preference_key] = bool(row.enabled)

    return result


@router.put("/notification-preferences")
def update_notification_preferences(
    payload: NotificationPreferencesUpdate,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_staff),
):
    allowed_keys = set(DEFAULT_PREFS.keys())
    old_preferences = get_notification_preferences(db, current_admin)

    for key, enabled in payload.preferences.items():
        if key not in allowed_keys:
            raise HTTPException(status_code=400, detail=f"Invalid preference key: {key}")

        row = db.query(UserNotificationPreference).filter(
            UserNotificationPreference.user_id == current_admin.id,
            UserNotificationPreference.preference_key == key,
        ).first()

        if row:
            row.enabled = enabled
        else:
            db.add(UserNotificationPreference(
                user_id=current_admin.id,
                preference_key=key,
                enabled=enabled,
            ))

    try:
        record_dashboard_event(
            db,
            current_admin,
            action="updated notification settings",
            table_name="user_notification_preferences",
            record_id=current_admin.id,
            message="Notification preferences were updated",
            preference_key="updated",
            old_values=old_preferences,
            new_values={**old_preferences, **payload.preferences},
        )
        db.commit()
        return {"message": "Notification preferences saved"}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))
    
@router.get("/session")
def get_current_session(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_staff),
):
    payload = _decode_token(token)

    role = db.query(MasterRole).filter(MasterRole.id == current_admin.role_id).first()

    issued_at = payload.get("iat")
    expires_at = payload.get("exp")

    return {
        "user_id": str(current_admin.id),
        "email": current_admin.email,
        "name": f"{current_admin.first_name} {current_admin.last_name or ''}".strip(),
        "role": role.role_name if role else None,
        "issued_at": issued_at,
        "expires_at": expires_at,
        "token_storage": "Local (Remembered)",
        "authentication": "JWT Bearer Token",
        "is_active": bool(current_admin.is_active),
        "last_login": current_admin.last_login.isoformat() if hasattr(current_admin.last_login, "isoformat") else str(current_admin.last_login) if current_admin.last_login else None,
    }

@router.get("/security")
def get_security_status(
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_staff),
):
    role = db.query(MasterRole).filter(MasterRole.id == current_admin.role_id).first()

    return {
        "two_factor_authentication": {
            "status": "not_enabled",
            "note": "Coming soon",
        },
        "password_protection": {
            "status": "enabled" if current_admin.password_hash else "disabled",
            "note": "Password is set" if current_admin.password_hash else "Password is missing",
        },
        "jwt_token_auth": {
            "status": "enabled",
            "note": "Active session",
        },
        "role_based_access": {
            "status": "enabled" if role else "disabled",
            "note": f"Access level: {role.role_name}" if role else "No role assigned",
        },
        "account_status": {
            "status": "enabled" if current_admin.is_active else "disabled",
            "note": "Account is active" if current_admin.is_active else "Account is disabled",
        },
    }
