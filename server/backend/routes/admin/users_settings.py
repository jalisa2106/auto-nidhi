import os
import re
from typing import Optional
from uuid import UUID

from backend.email_utils import send_email
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, validator
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import SystemUser, MasterRole
from backend.utils import get_current_admin, get_password_hash, record_dashboard_event

router = APIRouter(prefix="/api/v1/settings", tags=["Settings - Users"])


# ── Pydantic Schemas ────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    email: str
    password: str
    phone_number: Optional[str] = None
    role_id: Optional[UUID] = None
    is_active: bool = True

    @validator("first_name")
    def validate_first_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("First name is required")
        return v

    @validator("email")
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[^@]+@[^@]+\.[^@]+$", v):
            raise ValueError("Invalid email address")
        return v

    @validator("password")
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v

    @validator("phone_number")
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if v and not re.match(r"^\d{10,15}$", v.replace("+", "").replace("-", "")):
                raise ValueError("Invalid phone number")
        return v or None


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    role_id: Optional[UUID] = None
    is_active: Optional[bool] = None

    @validator("first_name")
    def validate_first_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("First name cannot be empty")
        return v


# ── Helper: serialize user row ──────────────────────────────────────────────

def _serialize(u: SystemUser, role_name: Optional[str] = None) -> dict:
    return {
        "id": str(u.id),
        "first_name": u.first_name,
        "last_name": u.last_name,
        "email": u.email,
        "phone_number": u.phone_number,
        "role_id": str(u.role_id) if u.role_id else None,
        "role_name": role_name or (u.role.role_name if u.role else None),
        "is_active": u.is_active,
        "last_login": u.last_login.isoformat() if hasattr(u, "last_login") and u.last_login else None,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }


# ── Routes ──────────────────────────────────────────────────────────────────

@router.get("/roles")
def list_roles(db: Session = Depends(get_db)):
    """List all roles available in master_role."""
    roles = db.query(MasterRole).order_by(MasterRole.role_name).all()
    return [{"id": str(r.id), "role_name": r.role_name, "description": r.description} for r in roles]


@router.get("/users")
def list_users(
    page: int = 1,
    limit: int = 50,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all system users with their role names."""
    query = db.query(SystemUser).outerjoin(MasterRole, SystemUser.role_id == MasterRole.id)

    if search:
        term = f"%{search}%"
        query = query.filter(
            SystemUser.first_name.ilike(term)
            | SystemUser.last_name.ilike(term)
            | SystemUser.email.ilike(term)
        )

    total = query.count()
    users = query.order_by(SystemUser.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    data = []
    for u in users:
        role_name = u.role.role_name if u.role else None
        data.append(_serialize(u, role_name))

    return {"data": data, "total": total, "page": page, "limit": limit}


@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    """Create a new system user with a hashed password."""
    # Validate unique email
    existing = db.query(SystemUser).filter(SystemUser.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    # Validate role_id if provided
    if payload.role_id:
        role = db.query(MasterRole).filter(MasterRole.id == payload.role_id).first()
        if not role:
            raise HTTPException(status_code=400, detail="Invalid role ID")

    user = SystemUser(
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip() if payload.last_name else None,
        email=payload.email.lower(),
        password_hash=get_password_hash(payload.password),
        phone_number=payload.phone_number,
        role_id=payload.role_id,
        is_active=payload.is_active,
    )
    db.add(user)
    try:
        db.flush()
        record_dashboard_event(
            db,
            current_admin,
            action="created user",
            table_name="system_user",
            record_id=user.id,
            message=f"User {user.email} was added",
            preference_key="added",
            new_values=_serialize(user),
        )
        db.commit()
        db.refresh(user)

        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        login_url = f"{frontend_url}/login"

        email_body = f"""Hello {user.first_name},

        Your Auto Nidhi account has been created.

        You can sign in using the details below:

        Login URL: {login_url}
        Email: {user.email}
        Password: {payload.password}

        For security, please change your password after your first login.

        Regards,
        Auto Nidhi Team
        """

        try:
            send_email(
                to_email=user.email,
                subject="Your Auto Nidhi account has been created",
                body=email_body,
            )
        except Exception as exc:
            print(f"Failed to send new user credentials email: {exc}")

        role_name = db.query(MasterRole).filter(MasterRole.id == user.role_id).first()
        return _serialize(user, role_name.role_name if role_name else None)

    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/users/{user_id}")
def update_user(
    user_id: UUID,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    """Update user profile — name, email, phone, role, or active status."""
    user = db.query(SystemUser).filter(SystemUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_values = _serialize(user)

    if payload.role_id:
        role = db.query(MasterRole).filter(MasterRole.id == payload.role_id).first()
        if not role:
            raise HTTPException(status_code=400, detail="Invalid role ID")

    # Validate unique email if changing
    if payload.email and payload.email.lower() != user.email:
        existing = db.query(SystemUser).filter(SystemUser.email == payload.email.lower()).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists",
            )

    update_data = payload.dict(exclude_none=True)
    for field, value in update_data.items():
        if field == "first_name" and value:
            value = value.strip()
        if field == "email" and value:
            value = value.strip().lower()
        setattr(user, field, value)

    try:
        record_dashboard_event(
            db,
            current_admin,
            action="updated user",
            table_name="system_user",
            record_id=user.id,
            message=f"User {user.email} was updated",
            preference_key="updated",
            old_values=old_values,
            new_values=_serialize(user),
        )
        db.commit()
        db.refresh(user)
        role_name = db.query(MasterRole).filter(MasterRole.id == user.role_id).first()
        return _serialize(user, role_name.role_name if role_name else None)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@router.patch("/users/{user_id}/toggle-active")
def toggle_user_active(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    """Toggle a user's active/inactive status."""
    user = db.query(SystemUser).filter(SystemUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = not user.is_active
    try:
        record_dashboard_event(
            db,
            current_admin,
            action="updated user status",
            table_name="system_user",
            record_id=user.id,
            message=f"User {user.email} was {'activated' if user.is_active else 'deactivated'}",
            preference_key="updated",
            old_values={"is_active": not user.is_active},
            new_values={"is_active": user.is_active},
        )
        db.commit()
        db.refresh(user)
        role = db.query(MasterRole).filter(MasterRole.id == user.role_id).first()
        return _serialize(user, role.role_name if role else None)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


# ── Admin Password Reset ────────────────────────────────────────────────────

class AdminResetPassword(BaseModel):
    new_password: str

    @validator("new_password")
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


@router.patch("/users/{user_id}/reset-password")
def admin_reset_password(
    user_id: UUID,
    payload: AdminResetPassword,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    """Admin resets a user's password (no old password needed)."""
    user = db.query(SystemUser).filter(SystemUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = get_password_hash(payload.new_password)
    try:
        record_dashboard_event(
            db,
            current_admin,
            action="reset user password",
            table_name="system_user",
            record_id=user.id,
            message=f"Password was reset for {user.email}",
            preference_key="updated",
        )
        
        db.commit()

        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        login_url = f"{frontend_url}/login"

        email_body = f"""Hello {user.first_name},

        Your Auto Nidhi password has been reset by an administrator.

        Login URL: {login_url}
        Email: {user.email}
        New Password: {payload.new_password}

        For security, please change your password after signing in.

        Regards,
        Auto Nidhi Team
        """

        try:
            send_email(
                to_email=user.email,
                subject="Your Auto Nidhi password has been reset",
                body=email_body,
            )
        except Exception as exc:
            print(f"Failed to send password reset credentials email: {exc}")

        return {"message": f"Password reset successfully for {user.email}"}

    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))