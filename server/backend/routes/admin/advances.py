import datetime
from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, validator
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Advance, MasterDealer, MasterBroker, SystemUser
from backend.utils import get_current_admin


router = APIRouter(prefix="/api/v1/advances", tags=["Admin Advances"])

VALID_MODES = {"cash", "cheque", "rtgs", "neft", "imps", "upi"}


class AdvanceCreate(BaseModel):
    dealer_id: Optional[UUID] = None
    broker_id: Optional[UUID] = None
    advance_date: date
    amount: float
    mode: str
    utr_cheque_number: Optional[str] = None
    purpose: Optional[str] = None
    remarks: Optional[str] = None

    @validator("mode")
    def validate_mode(cls, value: str) -> str:
        value = value.strip().lower()
        if value not in VALID_MODES:
            raise ValueError("Invalid payment mode")
        return value

    @validator("amount")
    def validate_amount(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("Amount must be greater than zero")
        return value


class AdvanceUpdate(BaseModel):
    amount_recovered: Optional[float] = None
    remarks: Optional[str] = None
    is_deleted: Optional[bool] = None


def _derive_recovery_status(amount: float, recovered: float) -> str:
    if recovered <= 0:
        return "pending"
    if recovered >= amount:
        return "fully_recovered"
    return "partial"


def _serialize(row: Advance) -> dict:
    party_type = "dealer" if row.dealer_id else "broker"
    party_name = ""

    if row.dealer:
        party_name = row.dealer.dealer_name
    elif row.broker:
        party_name = row.broker.broker_name

    return {
        "id": str(row.id),
        "dealer_id": str(row.dealer_id) if row.dealer_id else None,
        "broker_id": str(row.broker_id) if row.broker_id else None,
        "party_type": party_type,
        "party_name": party_name,
        "advance_date": row.advance_date.strftime("%Y-%m-%d"),
        "amount": float(row.amount),
        "mode": row.mode,
        "utr_cheque_number": row.utr_cheque_number or "",
        "purpose": row.purpose or "",
        "recovery_status": row.recovery_status,
        "amount_recovered": float(row.amount_recovered or 0),
        "remarks": row.remarks or "",
    }


@router.get("/")
def list_advances(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Advance).filter(Advance.is_deleted == False)

    if search:
        search_term = f"%{search.strip()}%"
        query = (
            query
            .outerjoin(MasterDealer, Advance.dealer_id == MasterDealer.id)
            .outerjoin(MasterBroker, Advance.broker_id == MasterBroker.id)
            .filter(
                MasterDealer.dealer_name.ilike(search_term)
                | MasterBroker.broker_name.ilike(search_term)
                | Advance.purpose.ilike(search_term)
                | Advance.remarks.ilike(search_term)
                | Advance.recovery_status.ilike(search_term)
            )
        )

    rows = query.order_by(Advance.advance_date.desc()).all()
    return [_serialize(row) for row in rows]


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_advance(
    payload: AdvanceCreate,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    has_dealer = payload.dealer_id is not None
    has_broker = payload.broker_id is not None

    if has_dealer == has_broker:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Select exactly one party: dealer or broker",
        )

    if payload.dealer_id:
        dealer = db.query(MasterDealer).filter(MasterDealer.id == payload.dealer_id).first()
        if not dealer:
            raise HTTPException(status_code=400, detail="Invalid dealer ID")

    if payload.broker_id:
        broker = db.query(MasterBroker).filter(
            MasterBroker.id == payload.broker_id,
            MasterBroker.is_deleted == False,
        ).first()
        if not broker:
            raise HTTPException(status_code=400, detail="Invalid broker ID")

    ref = (payload.utr_cheque_number or "").strip()

    if payload.mode == "cheque" and not ref:
        raise HTTPException(status_code=400, detail="Cheque number is required")

    if payload.mode in {"upi", "neft", "rtgs", "imps"} and not ref:
        raise HTTPException(status_code=400, detail="UTR / reference number is required")

    advance = Advance(
        dealer_id=payload.dealer_id,
        broker_id=payload.broker_id,
        advance_date=payload.advance_date,
        amount=payload.amount,
        mode=payload.mode,
        utr_cheque_number=ref,
        purpose=payload.purpose,
        remarks=payload.remarks,
        recovery_status="pending",
        amount_recovered=0,
        created_by=current_admin.id,
    )

    db.add(advance)

    try:
        db.commit()
        db.refresh(advance)
        return _serialize(advance)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@router.patch("/{advance_id}")
def update_advance(
    advance_id: UUID,
    payload: AdvanceUpdate,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    advance = db.query(Advance).filter(
        Advance.id == advance_id,
        Advance.is_deleted == False,
    ).first()

    if not advance:
        raise HTTPException(status_code=404, detail="Advance not found")

    if payload.is_deleted is True:
        advance.is_deleted = True
        advance.deleted_at = datetime.datetime.utcnow()
        db.commit()
        return {"status": "success"}

    if payload.amount_recovered is not None:
        if payload.amount_recovered < 0:
            raise HTTPException(status_code=400, detail="Recovered amount cannot be negative")

        if payload.amount_recovered > float(advance.amount):
            raise HTTPException(status_code=400, detail="Recovered amount cannot exceed advance amount")

        advance.amount_recovered = payload.amount_recovered
        advance.recovery_status = _derive_recovery_status(
            float(advance.amount),
            payload.amount_recovered,
        )

    if payload.remarks is not None:
        advance.remarks = payload.remarks

    try:
        db.commit()
        db.refresh(advance)
        return _serialize(advance)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{advance_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_advance(
    advance_id: UUID,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    advance = db.query(Advance).filter(
        Advance.id == advance_id,
        Advance.is_deleted == False,
    ).first()

    if not advance:
        raise HTTPException(status_code=404, detail="Advance not found")

    advance.is_deleted = True
    advance.deleted_at = datetime.datetime.utcnow()

    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))