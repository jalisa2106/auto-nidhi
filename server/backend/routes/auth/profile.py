from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import SystemUser
from backend.utils import get_current_user, verify_password, get_password_hash

router = APIRouter(prefix="/api/v1/auth", tags=["Auth Profile"])


class AuthProfileResponse(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    email: EmailStr
    phone_number: Optional[str] = None


class AuthProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None

    @field_validator("first_name", "last_name", mode="before")
    @classmethod
    def strip_names(cls, value):
        if value is None:
            return value
        return value.strip()

    @field_validator("first_name")
    @classmethod
    def validate_first_name(cls, value):
        if value is not None and not value:
            raise ValueError("First name cannot be empty")
        return value

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, value):
        if value is None or value == "":
            return value
        if not value.isdigit() or len(value) != 10:
            raise ValueError("Phone number must be exactly 10 digits")
        return value


class AuthChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.put("/update-profile", response_model=AuthProfileResponse)
async def update_profile(
    payload: AuthProfileUpdate,
    db: Session = Depends(get_db),
    current_user: SystemUser = Depends(get_current_user),
):
    update_data = payload.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return AuthProfileResponse(
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        email=current_user.email,
        phone_number=current_user.phone_number,
    )


@router.post("/change-password")
async def change_password(
    payload: AuthChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: SystemUser = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )

    if verify_password(payload.new_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )

    current_user.password_hash = get_password_hash(payload.new_password)
    current_user.must_change_password = False
    current_user.password_expires_at = None
    db.commit()

    return {"message": "Password changed successfully"}
