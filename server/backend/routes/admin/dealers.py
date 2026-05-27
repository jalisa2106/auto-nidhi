import re
import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, validator
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import MasterDealer, SystemUser
from backend.utils import get_current_admin, record_dashboard_event

router = APIRouter(prefix="/api/v1/dealers", tags=["Admin Dealers"])

PHONE_REGEX = re.compile(r"^\d{10}$")


class DealerCreate(BaseModel):
    name: str
    city: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

    @validator("name")
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Dealer name is required")
        return value

    @validator("phone")
    def validate_phone(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value.strip() == "":
            return None
        digits = re.sub(r"\D", "", value)
        if not PHONE_REGEX.match(digits):
            raise ValueError("Phone must be 10 digits")
        return digits

    @validator("email")
    def validate_email(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value.strip() == "":
            return None
        value = value.strip()
        if "@" not in value or "." not in value:
            raise ValueError("Invalid email address")
        return value


class DealerUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

    @validator("name")
    def validate_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Dealer name cannot be empty")
        return value

    @validator("phone")
    def validate_phone(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value.strip() == "":
            return None
        digits = re.sub(r"\D", "", value)
        if not PHONE_REGEX.match(digits):
            raise ValueError("Phone must be 10 digits")
        return digits


def _serialize(dealer: MasterDealer) -> dict:
    return {
        "id": str(dealer.id),
        "name": dealer.dealer_name,
        "city": dealer.city or "",
        "phone": dealer.phone or "",
        "email": dealer.email or "",
    }


@router.get("/")
def list_dealers(search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(MasterDealer).filter(MasterDealer.is_deleted == False)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            MasterDealer.dealer_name.ilike(search_term)
            | MasterDealer.city.ilike(search_term)
            | MasterDealer.phone.ilike(search_term)
            | MasterDealer.email.ilike(search_term)
        )

    dealers = query.order_by(MasterDealer.dealer_name).all()
    return [_serialize(dealer) for dealer in dealers]


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_dealer(
    payload: DealerCreate,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    if payload.phone:
        existing = db.query(MasterDealer).filter(
            MasterDealer.phone == payload.phone,
            MasterDealer.is_deleted == False,
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail="A dealer with this phone number already exists")

    dealer = MasterDealer(
        dealer_name=payload.name,
        city=payload.city,
        phone=payload.phone,
        email=payload.email,
    )

    db.add(dealer)

    try:
        db.flush()
        record_dashboard_event(
            db,
            current_admin,
            action="created dealer",
            table_name="master_dealer",
            record_id=dealer.id,
            message=f"Dealer {dealer.dealer_name} was added",
            preference_key="added",
            new_values=_serialize(dealer),
        )
        db.commit()
        db.refresh(dealer)
        return _serialize(dealer)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/{dealer_id}")
def update_dealer(
    dealer_id: UUID,
    payload: DealerUpdate,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    dealer = db.query(MasterDealer).filter(
        MasterDealer.id == dealer_id,
        MasterDealer.is_deleted == False,
    ).first()

    if not dealer:
        raise HTTPException(status_code=404, detail="Dealer not found")

    old_values = _serialize(dealer)
    update_data = payload.dict(exclude_unset=True)

    if "phone" in update_data and update_data["phone"]:
        conflict = db.query(MasterDealer).filter(
            MasterDealer.phone == update_data["phone"],
            MasterDealer.id != dealer_id,
            MasterDealer.is_deleted == False,
        ).first()
        if conflict:
            raise HTTPException(status_code=409, detail="Another dealer with this phone number already exists")

    if "name" in update_data:
        dealer.dealer_name = update_data["name"]
    if "city" in update_data:
        dealer.city = update_data["city"]
    if "phone" in update_data:
        dealer.phone = update_data["phone"]
    if "email" in update_data:
        dealer.email = update_data["email"]

    try:
        record_dashboard_event(
            db,
            current_admin,
            action="updated dealer",
            table_name="master_dealer",
            record_id=dealer.id,
            message=f"Dealer {dealer.dealer_name} was updated",
            preference_key="updated",
            old_values=old_values,
            new_values=_serialize(dealer),
        )
        db.commit()
        db.refresh(dealer)
        return _serialize(dealer)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{dealer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dealer(
    dealer_id: UUID,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    dealer = db.query(MasterDealer).filter(MasterDealer.id == dealer_id).first()

    if not dealer:
        raise HTTPException(status_code=404, detail="Dealer not found")

    dealer.is_deleted = True
    dealer.deleted_at = datetime.datetime.utcnow()

    try:
        record_dashboard_event(
            db,
            current_admin,
            action="deleted dealer",
            table_name="master_dealer",
            record_id=dealer.id,
            message=f"Dealer {dealer.dealer_name} was deleted",
            preference_key="deleted",
            old_values=_serialize(dealer),
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))
