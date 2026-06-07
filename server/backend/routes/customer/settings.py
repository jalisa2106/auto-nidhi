import os
import jwt
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import SystemUser, MasterRole, UserNotificationPreference, Customer
from backend.utils import get_current_customer, record_dashboard_event

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-secret-key")
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

router = APIRouter(
    prefix="/api/v1/portal/settings",
    tags=["Customer Settings"],
)

CUSTOMER_DEFAULT_PREFS = {
    "file_update": True,
    "payment": True,
    "insurance": True,
    "document": True,
    "general": True,
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
def get_customer_notification_preferences(
    db: Session = Depends(get_db),
    current_customer: SystemUser = Depends(get_current_customer),
):
    rows = (
        db.query(UserNotificationPreference)
        .filter(UserNotificationPreference.user_id == current_customer.id)
        .all()
    )

    result = CUSTOMER_DEFAULT_PREFS.copy()

    for row in rows:
        if row.preference_key in result:
            result[row.preference_key] = bool(row.enabled)

    return result


@router.put("/notification-preferences")
def update_customer_notification_preferences(
    payload: NotificationPreferencesUpdate,
    db: Session = Depends(get_db),
    current_customer: SystemUser = Depends(get_current_customer),
):
    allowed_keys = set(CUSTOMER_DEFAULT_PREFS.keys())
    old_preferences = get_customer_notification_preferences(db, current_customer)

    for key, enabled in payload.preferences.items():
        if key not in allowed_keys:
            raise HTTPException(status_code=400, detail=f"Invalid preference key: {key}")

        row = (
            db.query(UserNotificationPreference)
            .filter(
                UserNotificationPreference.user_id == current_customer.id,
                UserNotificationPreference.preference_key == key,
            )
            .first()
        )

        if row:
            row.enabled = enabled
        else:
            db.add(
                UserNotificationPreference(
                    user_id=current_customer.id,
                    preference_key=key,
                    enabled=enabled,
                )
            )

    try:
        record_dashboard_event(
            db,
            current_customer,
            action="updated customer notification settings",
            table_name="user_notification_preferences",
            record_id=current_customer.id,
            message="Customer notification preferences were updated",
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
def get_customer_session(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
    current_customer: SystemUser = Depends(get_current_customer),
):
    payload = _decode_token(token)

    role = db.query(MasterRole).filter(MasterRole.id == current_customer.role_id).first()

    issued_at = payload.get("iat")
    expires_at = payload.get("exp")

    return {
        "user_id": str(current_customer.id),
        "email": current_customer.email,
        "name": f"{current_customer.first_name} {current_customer.last_name or ''}".strip(),
        "role": role.role_name if role else None,
        "issued_at": issued_at,
        "expires_at": expires_at,
        "token_storage": "Local (Remembered)",
        "authentication": "JWT Bearer Token",
        "is_active": bool(current_customer.is_active),
        "last_login": current_customer.last_login.isoformat() if hasattr(current_customer.last_login, "isoformat") else str(current_customer.last_login) if current_customer.last_login else None,
    }


@router.get("/security")
def get_customer_security_status(
    db: Session = Depends(get_db),
    current_customer: SystemUser = Depends(get_current_customer),
):
    role = db.query(MasterRole).filter(MasterRole.id == current_customer.role_id).first()

    return {
        "two_factor_authentication": {
            "status": "not_enabled",
            "note": "Coming soon",
        },
        "password_protection": {
            "status": "enabled" if current_customer.password_hash else "disabled",
            "note": "Password is set" if current_customer.password_hash else "Password is missing",
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
            "status": "enabled" if current_customer.is_active else "disabled",
            "note": "Account is active" if current_customer.is_active else "Account is disabled",
        },
    }
@router.get("/notification-preferences")
def get_notification_preferences(
    current_user: SystemUser = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    customer = db.query(Customer).filter(Customer.email == current_user.email).first()
    if not customer:
        return []
    prefs = db.execute(
        text("SELECT pref_key, is_enabled FROM customer_notification_preferences WHERE customer_id = :cid"),
        {"cid": str(customer.id)}
    ).mappings().all()
    return [dict(p) for p in prefs]

@router.post("/notification-preferences")
def save_notification_preferences(
    payload: List[dict],
    current_user: SystemUser = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    customer = db.query(Customer).filter(Customer.email == current_user.email).first()
    if not customer:
        raise HTTPException(404, "Customer not found")
    for item in payload:
        db.execute(
            text("""
            INSERT INTO customer_notification_preferences (customer_id, pref_key, is_enabled)
            VALUES (:cid, :key, :enabled)
            ON CONFLICT (customer_id, pref_key) DO UPDATE SET is_enabled = :enabled, updated_at = NOW()
            """),
            {"cid": str(customer.id), "key": item["key"], "enabled": item["enabled"]}
        )
    db.commit()
    return {"saved": True}
