from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import SystemUser, Customer, ModificationRequest
from backend.utils import get_current_customer, verify_password, get_password_hash, get_current_customer_profile

router = APIRouter(prefix="/api/v1/customer", tags=["Customer Profile"])


class CustomerProfileResponse(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    email: EmailStr
    phone_number: Optional[str] = None


class CustomerProfileUpdate(BaseModel):
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


class CustomerChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str


@router.get("/profile/me", response_model=CustomerProfileResponse)
async def get_customer_profile(
    current_user: SystemUser = Depends(get_current_customer),
):
    return CustomerProfileResponse(
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        email=current_user.email,
        phone_number=current_user.phone_number,
    )


@router.patch("/profile/me", response_model=CustomerProfileResponse)
async def update_customer_profile(
    payload: CustomerProfileUpdate,
    db: Session = Depends(get_db),
    current_user: SystemUser = Depends(get_current_customer),
):
    update_data = payload.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)

    return CustomerProfileResponse(
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        email=current_user.email,
        phone_number=current_user.phone_number,
    )


@router.patch("/profile/change-password")
async def change_customer_password(
    payload: CustomerChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: SystemUser = Depends(get_current_customer),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and confirm password do not match"
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

@router.post("/modification-requests")
def submit_customer_modification_request(
    payload: dict,
    current_user: SystemUser = Depends(get_current_customer),
    customer = Depends(get_current_customer_profile),
    db: Session = Depends(get_db),
):
    mod_req = ModificationRequest(
        entity_type="customer_staff_allocation",
        entity_id=str(customer.id),
        request_type="update",
        reason=payload.get("reason", ""),
        submitted_by=current_user.id,
        status="pending"
    )
    db.add(mod_req)
    db.commit()

    # Notify only admins
    from backend.models import MasterRole
    from backend.utils import send_targeted_notification
        
    admins = db.query(SystemUser).join(MasterRole).filter(MasterRole.role_name.ilike('admin')).all()
    for admin in admins:
        send_targeted_notification(
            db=db,
            target_user_id=admin.id,
            message=f"New staff change request from {customer.full_name}.",
            notification_type="general"
        )

    return {"submitted": True, "id": str(mod_req.id)}
