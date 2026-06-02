from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import PaymentIn, FileRecord, Customer, MasterCompanyBank, SystemUser
from backend.utils import get_current_staff, get_current_admin, record_dashboard_event

router = APIRouter(prefix="/api/v1/payments/in", tags=["Admin Payments IN"])

# ── DB Enum Normalizers ──────────────────────────────────────────────────────
# DB payment_mode enum: cash | cheque | rtgs | neft | imps | upi
def norm_mode(v: str) -> str:
    """Normalize any frontend payment mode string to DB enum lowercase value."""
    mapping = {
        "Cash": "cash", "CASH": "cash",
        "Cheque": "cheque", "CHEQUE": "cheque", "DD": "cheque", "Dd": "cheque",
        "RTGS": "rtgs", "Rtgs": "rtgs",
        "NEFT": "neft", "Neft": "neft",
        "IMPS": "imps", "Imps": "imps",
        "UPI": "upi", "Upi": "upi",
    }
    return mapping.get(v, v.lower())

# DB payment_from_enum: customer | company
# Frontend may send: Customer, Bank, Insurer, Other, Company
PAYMENT_FROM_MAP = {
    "customer": "customer", "Customer": "customer",
    "company": "company",   "Company": "company",
    "Bank": "company",      "bank": "company",
    "Insurer": "company",   "insurer": "company",
    "Other": "company",     "other": "company",
}

def norm_from(v: Optional[str]) -> Optional[str]:
    if not v:
        return None
    return PAYMENT_FROM_MAP.get(v, "company")


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


class PaymentInUpdate(BaseModel):
    payment_amount: Optional[float] = None
    paid_amount: Optional[float] = None
    remaining_amount: Optional[float] = None
    round_up: Optional[bool] = None
    payment_mode: Optional[str] = None
    payment_date: Optional[date] = None
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

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            FileRecord.file_number.ilike(search_term) |
            Customer.full_name.ilike(search_term) |
            PaymentIn.remarks.ilike(search_term)
        )
    if payment_mode:
        query = query.filter(PaymentIn.payment_mode == norm_mode(payment_mode))
    if payment_from:
        query = query.filter(PaymentIn.payment_from == norm_from(payment_from))
    if date_from:
        query = query.filter(PaymentIn.payment_date >= date_from)
    if date_to:
        query = query.filter(PaymentIn.payment_date <= date_to)

    total = query.count()
    payments = query.order_by(PaymentIn.payment_date.desc()).offset((page - 1) * limit).limit(limit).all()

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
        "company_bank_label": f"{p.company_bank.bank_name} – {p.company_bank.account_number}" if p.company_bank_id and p.company_bank else None,
        "remarks": p.remarks
    } for p in payments]

    return {"data": data, "total": total, "page": page, "limit": limit}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_payment_in(
    payload: PaymentInCreate,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_staff),
):
    new_payment = PaymentIn(
        file_id=payload.file_id,
        payment_amount=payload.payment_amount,
        paid_amount=payload.paid_amount,
        remaining_amount=payload.remaining_amount,
        round_up=payload.round_up or False,
        payment_mode=norm_mode(payload.payment_mode),   # normalize: UPI -> upi
        payment_date=payload.payment_date,
        payment_from=norm_from(payload.payment_from),   # normalize: Customer -> customer
        cheque_bank_name=payload.cheque_bank_name,
        branch_name=payload.branch_name,
        cheque_no=payload.cheque_no,
        cheque_date=payload.cheque_date,
        utr_no=payload.utr_no,
        company_bank_id=payload.company_bank_id,
        remarks=payload.remarks,
    )
    db.add(new_payment)
    try:
        db.flush()
        record_dashboard_event(
            db,
            current_admin,
            action="created payment in",
            table_name="payment_in",
            record_id=new_payment.id,
            message=f"Payment in of {new_payment.payment_amount} was recorded",
            preference_key="added",
            new_values={
                "id": str(new_payment.id),
                "file_id": str(new_payment.file_id),
                "payment_amount": float(new_payment.payment_amount),
                "payment_mode": new_payment.payment_mode,
                "payment_date": str(new_payment.payment_date),
            },
        )
        db.commit()
        db.refresh(new_payment)
        return {"status": "success", "id": str(new_payment.id)}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/{payment_id}")
def update_payment_in(
    payment_id: UUID,
    payload: PaymentInUpdate,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_staff),
):
    payment = db.query(PaymentIn).filter(PaymentIn.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment IN record not found")

    old_values = {
        "payment_amount": float(payment.payment_amount),
        "payment_mode": payment.payment_mode,
        "payment_date": str(payment.payment_date),
    }

    update_data = payload.dict(exclude_none=True)
    for field, value in update_data.items():
        if field == "payment_mode" and value:
            value = norm_mode(value)
        if field == "payment_from" and value:
            value = norm_from(value)
        setattr(payment, field, value)

    try:
        record_dashboard_event(
            db,
            current_admin,
            action="updated payment in",
            table_name="payment_in",
            record_id=payment.id,
            message=f"Payment IN {payment_id} was updated",
            preference_key="updated",
            old_values=old_values,
            new_values={"payment_amount": float(payment.payment_amount), "payment_mode": payment.payment_mode},
        )
        db.commit()
        db.refresh(payment)
        return {"status": "success", "id": str(payment.id)}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{payment_id}", status_code=200)
def delete_payment_in(
    payment_id: UUID,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    payment = db.query(PaymentIn).filter(PaymentIn.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment IN record not found")

    try:
        record_dashboard_event(
            db,
            current_admin,
            action="deleted payment in",
            table_name="payment_in",
            record_id=payment.id,
            message=f"Payment IN {payment_id} was deleted",
            preference_key="deleted",
            old_values={"payment_amount": float(payment.payment_amount)},
        )
        db.delete(payment)
        db.commit()
        return {"status": "success", "message": "Payment IN deleted"}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))
