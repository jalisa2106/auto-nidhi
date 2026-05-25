from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import RTOPayment, FileRecord, Customer

router = APIRouter(prefix="/api/v1/rto-payments", tags=["Admin RTO Payments"])

class RTOPaymentCreate(BaseModel):
    file_id: UUID
    payment_date: date
    payment_mode: str
    amount: float
    payee_dealer_id: Optional[UUID] = None
    payee_broker_id: Optional[UUID] = None
    bank_account_no: Optional[str] = None
    ifsc_code: Optional[str] = None
    cheque_bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    cheque_no: Optional[str] = None
    cheque_date: Optional[date] = None
    cheque_amount: Optional[float] = None
    utr_no: Optional[str] = None
    remarks: Optional[str] = None

@router.get("/")
def list_rto_payments(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    payment_mode: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
):
    query = db.query(RTOPayment).join(FileRecord).join(Customer)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            FileRecord.file_number.ilike(search_term) |
            RTOPayment.remarks.ilike(search_term)
        )
    if payment_mode:
        query = query.filter(RTOPayment.payment_mode == payment_mode)
    if date_from:
        query = query.filter(RTOPayment.payment_date >= date_from)
    if date_to:
        query = query.filter(RTOPayment.payment_date <= date_to)

    total = query.count()
    payments = query.order_by(RTOPayment.payment_date.desc()).offset((page - 1) * limit).limit(limit).all()

    data = []
    for p in payments:
        data.append({
            "id": str(p.id),
            "file_id": str(p.file_id),
            "file_number": p.file.file_number if p.file else "N/A",
            "customer": p.file.customer.full_name if p.file and p.file.customer else "N/A",
            "payment_date": p.payment_date.strftime("%Y-%m-%d"),
            "payment_mode": p.payment_mode,
            "amount": float(p.amount),
            "payee_dealer_id": str(p.payee_dealer_id) if p.payee_dealer_id else None,
            "payee_broker_id": str(p.payee_broker_id) if p.payee_broker_id else None,
            "bank_account_no": p.bank_account_no,
            "ifsc_code": p.ifsc_code,
            "cheque_bank_name": p.cheque_bank_name,
            "branch_name": p.branch_name,
            "cheque_no": p.cheque_no,
            "cheque_date": p.cheque_date.strftime("%Y-%m-%d") if p.cheque_date else None,
            "cheque_amount": float(p.cheque_amount) if p.cheque_amount is not None else None,
            "utr_no": p.utr_no,
            "remarks": p.remarks,
        })

    return {"data": data, "total": total, "page": page, "limit": limit}

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_rto_payment(payload: RTOPaymentCreate, db: Session = Depends(get_db)):
    if payload.payee_dealer_id and payload.payee_broker_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only one payee type can be provided")

    new_payment = RTOPayment(
        file_id=payload.file_id,
        payment_date=payload.payment_date,
        payment_mode=payload.payment_mode,
        amount=payload.amount,
        payee_dealer_id=payload.payee_dealer_id,
        payee_broker_id=payload.payee_broker_id,
        bank_account_no=payload.bank_account_no,
        ifsc_code=payload.ifsc_code,
        cheque_bank_name=payload.cheque_bank_name,
        branch_name=payload.branch_name,
        cheque_no=payload.cheque_no,
        cheque_date=payload.cheque_date,
        cheque_amount=payload.cheque_amount,
        utr_no=payload.utr_no,
        remarks=payload.remarks,
    )
    db.add(new_payment)
    try:
        db.commit()
        db.refresh(new_payment)
        return {"status": "success", "id": str(new_payment.id)}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
