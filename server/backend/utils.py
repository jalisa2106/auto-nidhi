import os
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from uuid import UUID
from typing import Any, Optional
import json

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.database import get_db
from backend.models import SystemUser, MasterRole


SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")


def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode("utf-8")
    hashed_password = bcrypt.hashpw(pwd_bytes, bcrypt.gensalt())
    return hashed_password.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({
        "iat": int(now.timestamp()),
        "exp": expire,
    })

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> SystemUser:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")

        if user_id is None:
            raise credentials_exception

        try:
            user_uuid = UUID(str(user_id))
        except (TypeError, ValueError):
            raise credentials_exception

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.PyJWTError:
        raise credentials_exception

    user = db.query(SystemUser).filter(SystemUser.id == user_uuid).first()

    if user is None:
        raise credentials_exception

    return user


def get_current_admin(
    current_user: SystemUser = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> SystemUser:
    role = db.query(MasterRole).filter(MasterRole.id == current_user.role_id).first()

    if not role or role.role_name.lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return current_user


def get_current_customer(
    current_user: SystemUser = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> SystemUser:
    role = db.query(MasterRole).filter(MasterRole.id == current_user.role_id).first()

    if not role or role.role_name.lower() != "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customer access required"
        )

    return current_user

def get_password_hash(password: str) -> str:
    # Bcrypt requires bytes, so we encode the password string
    pwd_bytes = password.encode('utf-8')
    # Generate a secure salt
    salt = bcrypt.gensalt()
    # Hash the password
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    # Decode back to a string so it can be saved in the PostgreSQL database
    return hashed_password.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Convert both the plain password and the stored hash into bytes for comparison
    password_bytes = plain_password.encode('utf-8')
    hashed_password_bytes = hashed_password.encode('utf-8')
    
    return bcrypt.checkpw(password_bytes, hashed_password_bytes)


def _jsonb(value: Optional[dict[str, Any]]) -> Optional[str]:
    if value is None:
        return None
    return json.dumps(value, default=str)


def _notification_enabled(db: Session, user_id: UUID, preference_key: str) -> bool:
    row = db.execute(
        text(
            """
            SELECT enabled
            FROM user_notification_preferences
            WHERE user_id = :user_id AND preference_key = :preference_key
            """
        ),
        {"user_id": str(user_id), "preference_key": preference_key},
    ).mappings().first()

    return True if row is None else bool(row["enabled"])


def record_dashboard_event(
    db: Session,
    user: SystemUser,
    *,
    action: str,
    table_name: str,
    record_id: Optional[UUID],
    message: str,
    preference_key: str = "info",
    old_values: Optional[dict[str, Any]] = None,
    new_values: Optional[dict[str, Any]] = None,
) -> None:
    db.execute(
        text(
            """
            INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
            VALUES (:user_id, :action, :table_name, :record_id, CAST(:old_values AS JSONB), CAST(:new_values AS JSONB))
            """
        ),
        {
            "user_id": str(user.id),
            "action": action,
            "table_name": table_name,
            "record_id": str(record_id) if record_id else None,
            "old_values": _jsonb(old_values),
            "new_values": _jsonb(new_values),
        },
    )

    if not _notification_enabled(db, user.id, preference_key):
        return

    db.execute(
        text(
            """
            INSERT INTO notifications (user_id, notification_type, message)
            VALUES (:user_id, 'general', :message)
            """
        ),
        {"user_id": str(user.id), "message": message},
    )
