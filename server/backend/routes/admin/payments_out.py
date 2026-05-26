from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import PaymentOut, FileRecord, Customer, MasterCompanyBank

router = APIRouter(prefix="/api/v1/payments/out", tags=["Admin Payments OUT"])

class PaymentOutCreate(BaseModel):
    file_id: UUID
    payment_to: str
    payee_name: str
    amount: float
    payment_mode: str
    payment_date: date
    company_bank_id: Optional[UUID] = None
    cheque_bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    cheque_no: Optional[str] = None
    cheque_date: Optional[date] = None
    utr_no: Optional[str] = None
    remarks: Optional[str] = None

@router.get("/")
def list_payments_out(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    payment_mode: Optional[str] = None,
    payment_to: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db)
):
    query = db.query(PaymentOut).join(FileRecord).join(Customer)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            FileRecord.file_number.ilike(search_term) |
            PaymentOut.remarks.ilike(search_term)
        )
    if payment_mode:
        query = query.filter(PaymentOut.payment_mode == payment_mode)
    if payment_to:
        query = query.filter(PaymentOut.payment_to == payment_to)
    if date_from:
        query = query.filter(PaymentOut.payment_date >= date_from)
    if date_to:
        query = query.filter(PaymentOut.payment_date <= date_to)

    total = query.count()
    payments = query.order_by(PaymentOut.payment_date.desc()).offset((page - 1) * limit).limit(limit).all()

    data = []
    for p in payments:
        # Extract payee_name — stored as "[Payee: name] remarks" in older records
        extracted_payee = "Unknown"
        clean_remarks = p.remarks or ""
        if clean_remarks.startswith("[Payee: "):
            end_idx = clean_remarks.find("] ")
            if end_idx != -1:
                extracted_payee = clean_remarks[8:end_idx]
                clean_remarks = clean_remarks[end_idx + 2:]
        else:
            extracted_payee = clean_remarks  # For newer records, remarks is plain

        # Resolve company bank label
        company_bank_label = None
        if p.company_bank_id and p.company_bank:
            company_bank_label = f"{p.company_bank.bank_name} – {p.company_bank.account_number}"

        data.append({
            "id": str(p.id),
            "file_id": str(p.file_id),
            "file_number": p.file.file_number if p.file else "N/A",
            "customer": p.file.customer.full_name if p.file and p.file.customer else "N/A",
            "payment_to": p.payment_to,
            "payee_name": extracted_payee,
            "amount": float(p.amount),
            "payment_mode": p.payment_mode,
            "payment_date": p.payment_date.strftime("%Y-%m-%d"),
            "company_bank_id": str(p.company_bank_id) if p.company_bank_id else None,
            "company_bank_label": company_bank_label,
            "cheque_bank_name": p.cheque_bank_name,
            "branch_name": p.branch_name,
            "cheque_no": p.cheque_no,
            "cheque_date": p.cheque_date.strftime("%Y-%m-%d") if p.cheque_date else None,
            "utr_no": p.utr_no,
            "remarks": clean_remarks if clean_remarks else None,
        })

    return {"data": data, "total": total, "page": page, "limit": limit}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_payment_out(payload: PaymentOutCreate, db: Session = Depends(get_db)):
    # Validate company_bank_id if provided
    if payload.company_bank_id:
        bank = db.query(MasterCompanyBank).filter(MasterCompanyBank.id == payload.company_bank_id).first()
        if not bank:
            raise HTTPException(status_code=400, detail="Invalid company bank account ID")

    # Store payee_name directly in remarks field (prefixed) to avoid schema change for older compat
    bundled_remarks = f"[Payee: {payload.payee_name}] {payload.remarks or ''}".strip()

    new_payment = PaymentOut(
        file_id=payload.file_id,
        amount=payload.amount,
        payment_mode=payload.payment_mode.lower(),
        payment_date=payload.payment_date,
        payment_to=payload.payment_to.lower() if payload.payment_to else None,
        company_bank_id=payload.company_bank_id,
        cheque_bank_name=payload.cheque_bank_name,
        branch_name=payload.branch_name,
        cheque_no=payload.cheque_no,
        cheque_date=payload.cheque_date,
        utr_no=payload.utr_no,
        remarks=bundled_remarks,
    )
    db.add(new_payment)
    try:
        db.commit()
        db.refresh(new_payment)
        return {"status": "success", "id": str(new_payment.id)}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))