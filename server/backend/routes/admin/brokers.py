import re
import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, validator
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import MasterBroker, SystemUser
from backend.utils import get_current_staff, get_current_admin, record_dashboard_event

router = APIRouter(prefix="/api/v1/brokers", tags=["Admin Brokers"])

PHONE_REGEX = re.compile(r"^\d{10}$")


class BrokerCreate(BaseModel):
    broker_name: str
    area: Optional[str] = None
    district: Optional[str] = None
    phone: Optional[str] = None
    status: str = "Active"

    @validator("broker_name")
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Broker name is required")
        return value

    @validator("area")
    def validate_area(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value.strip() == "":
            raise ValueError("Area is required")
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("Area must be at least 2 characters")
        return cleaned

    @validator("district")
    def validate_district(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value.strip() == "":
            raise ValueError("City / district is required")
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("City / district must be at least 2 characters")
        return cleaned

    @validator("phone")
    def validate_phone(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value.strip() == "":
            return None
        digits = re.sub(r"\D", "", value)
        if not PHONE_REGEX.match(digits):
            raise ValueError("Phone must be 10 digits")
        return digits


class BrokerUpdate(BaseModel):
    broker_name: Optional[str] = None
    area: Optional[str] = None
    district: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None

    @validator("broker_name")
    def validate_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Broker name cannot be empty")
        return cleaned

    @validator("phone")
    def validate_phone(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value.strip() == "":
            return None
        digits = re.sub(r"\D", "", value)
        if not PHONE_REGEX.match(digits):
            raise ValueError("Phone must be 10 digits")
        return digits


def _serialize(broker: MasterBroker) -> dict:
    return {
        "id": str(broker.id),
        "broker_name": broker.broker_name,
        "area": broker.area,
        "district": broker.district,
        "phone": broker.phone,
        "status": broker.status,
        "is_deleted": broker.is_deleted,
    }


@router.get("/")
def list_brokers(search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(MasterBroker).filter(MasterBroker.is_deleted == False)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            MasterBroker.broker_name.ilike(search_term)
            | MasterBroker.area.ilike(search_term)
            | MasterBroker.district.ilike(search_term)
            | MasterBroker.phone.ilike(search_term)
        )
    brokers = query.order_by(MasterBroker.broker_name).all()
    return [_serialize(b) for b in brokers]


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_broker(
    payload: BrokerCreate,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    if payload.phone:
        existing = db.query(MasterBroker).filter(MasterBroker.phone == payload.phone, MasterBroker.is_deleted == False).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A broker with this phone number already exists")

    broker = MasterBroker(
        broker_name=payload.broker_name,
        area=payload.area,
        district=payload.district,
        phone=payload.phone,
        status=payload.status,
    )
    db.add(broker)
    try:
        db.flush()
        record_dashboard_event(
            db,
            current_admin,
            action="created broker",
            table_name="master_broker",
            record_id=broker.id,
            message=f"Broker {broker.broker_name} was added",
            preference_key="added",
            new_values=_serialize(broker),
        )
        db.commit()
        db.refresh(broker)
        return _serialize(broker)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.put("/{broker_id}")
def update_broker(
    broker_id: UUID,
    payload: BrokerUpdate,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    broker = db.query(MasterBroker).filter(MasterBroker.id == broker_id, MasterBroker.is_deleted == False).first()
    if not broker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Broker not found")

    old_values = _serialize(broker)
    update_data = payload.dict(exclude_none=True)
    if "phone" in update_data and update_data["phone"]:
        conflict = db.query(MasterBroker).filter(
            MasterBroker.phone == update_data["phone"],
            MasterBroker.id != broker_id,
            MasterBroker.is_deleted == False,
        ).first()
        if conflict:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Another broker with this phone number already exists")

    for field, value in update_data.items():
        setattr(broker, field, value)

    try:
        record_dashboard_event(
            db,
            current_admin,
            action="updated broker",
            table_name="master_broker",
            record_id=broker.id,
            message=f"Broker {broker.broker_name} was updated",
            preference_key="updated",
            old_values=old_values,
            new_values=_serialize(broker),
        )
        db.commit()
        db.refresh(broker)
        return _serialize(broker)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.delete("/{broker_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_broker(
    broker_id: UUID,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    broker = db.query(MasterBroker).filter(MasterBroker.id == broker_id).first()
    if not broker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Broker not found")

    try:
        broker.is_deleted = True
        broker.deleted_at = datetime.datetime.utcnow()
        record_dashboard_event(
            db,
            current_admin,
            action="deleted broker",
            table_name="master_broker",
            record_id=broker.id,
            message=f"Broker {broker.broker_name} was deleted",
            preference_key="deleted",
            old_values=_serialize(broker),
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))