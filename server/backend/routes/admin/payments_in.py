from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import PaymentIn, FileRecord, Customer

router = APIRouter(prefix="/api/v1/payments/in", tags=["Admin Payments IN"])

class PaymentInCreate(BaseModel):
    file_id: UUID
    payment_amount: float
    paid_amount: Optional[float] = None
    remaining_amount: Optional[float] = None
    round_up: Optional[bool] = False
    payment_mode: str
    payment_date: date
    payment_from: Optional[str] = None
    cheque_bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    cheque_no: Optional[str] = None
    cheque_date: Optional[date] = None
    utr_no: Optional[str] = None
    company_bank_id: Optional[UUID] = None
    remarks: Optional[str] = None

@router.get("/")
def list_payments_in(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    payment_mode: Optional[str] = None,
    payment_from: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db)
):
    query = db.query(PaymentIn).join(FileRecord).join(Customer)

    # Filtering Logic matching the frontend dropdowns
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            FileRecord.file_number.ilike(search_term) |
            Customer.full_name.ilike(search_term) |
            PaymentIn.remarks.ilike(search_term)
        )
    if payment_mode:
        query = query.filter(PaymentIn.payment_mode == payment_mode)
    if payment_from:
        query = query.filter(PaymentIn.payment_from == payment_from)
    if date_from:
        query = query.filter(PaymentIn.payment_date >= date_from)
    if date_to:
        query = query.filter(PaymentIn.payment_date <= date_to)

    total = query.count()
    payments = query.order_by(PaymentIn.payment_date.desc()).offset((page - 1) * limit).limit(limit).all()

    # Map the response perfectly to what PaymentInPage.tsx expects
    data = [{
        "id": str(p.id),
        "file_id": str(p.file_id),
        "file_number": p.file.file_number if p.file else "N/A",
        "customer": p.file.customer.full_name if p.file and p.file.customer else "N/A",
        "payment_amount": float(p.payment_amount),
        "paid_amount": float(p.paid_amount) if p.paid_amount else 0.0,
        "remaining_amount": float(p.remaining_amount) if p.remaining_amount else 0.0,
        "round_up": p.round_up,
        "payment_mode": p.payment_mode,
        "payment_date": p.payment_date.strftime("%Y-%m-%d"),
        "payment_from": p.payment_from,
        "cheque_bank_name": p.cheque_bank_name,
        "branch_name": p.branch_name,
        "cheque_no": p.cheque_no,
        "cheque_date": p.cheque_date.strftime("%Y-%m-%d") if p.cheque_date else None,
        "utr_no": p.utr_no,
        "company_bank_id": str(p.company_bank_id) if p.company_bank_id else None,
        "remarks": p.remarks
    } for p in payments]

    return {"data": data, "total": total, "page": page, "limit": limit}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_payment_in(payload: PaymentInCreate, db: Session = Depends(get_db)):
    new_payment = PaymentIn(**payload.dict(exclude_none=True))
    db.add(new_payment)
    try:
        db.commit()
        db.refresh(new_payment)
        return {"status": "success", "id": str(new_payment.id)}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))