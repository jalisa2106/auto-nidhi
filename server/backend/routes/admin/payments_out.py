from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import PaymentOut, FileRecord, Customer, MasterCompanyBank, SystemUser
from backend.utils import get_current_admin, record_dashboard_event

router = APIRouter(prefix="/api/v1/payments/out", tags=["Admin Payments OUT"])

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

# DB payment_to_enum: customer | dealer | broker
# Frontend sends: Customer, Dealer, Broker, Agent, Other
PAYMENT_TO_MAP = {
    "customer": "customer", "Customer": "customer",
    "dealer": "dealer",     "Dealer": "dealer",
    "broker": "broker",     "Broker": "broker",
    "agent": "broker",      "Agent": "broker", # map Agent to broker
    "other": "broker",      "Other": "broker", # map Other to broker
}

def norm_to(v: Optional[str]) -> Optional[str]:
    if not v:
        return None
    return PAYMENT_TO_MAP.get(v, "broker")


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


class PaymentOutUpdate(BaseModel):
    payment_to: Optional[str] = None
    payee_name: Optional[str] = None
    amount: Optional[float] = None
    payment_mode: Optional[str] = None
    payment_date: Optional[date] = None
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
        query = query.filter(PaymentOut.payment_mode == norm_mode(payment_mode))
    if payment_to:
        query = query.filter(PaymentOut.payment_to == norm_to(payment_to))
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
def create_payment_out(
    payload: PaymentOutCreate,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
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
        payment_mode=norm_mode(payload.payment_mode),   # normalize: NEFT -> neft
        payment_date=payload.payment_date,
        payment_to=norm_to(payload.payment_to),         # normalize: Dealer -> dealer
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
        db.flush()
        record_dashboard_event(
            db,
            current_admin,
            action="created payment out",
            table_name="payment_out",
            record_id=new_payment.id,
            message=f"Payment out of {new_payment.amount} was recorded",
            preference_key="added",
            new_values={
                "id": str(new_payment.id),
                "file_id": str(new_payment.file_id),
                "amount": float(new_payment.amount),
                "payment_to": new_payment.payment_to,
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
def update_payment_out(
    payment_id: UUID,
    payload: PaymentOutUpdate,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    payment = db.query(PaymentOut).filter(PaymentOut.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment OUT record not found")

    old_values = {"amount": float(payment.amount), "payment_mode": payment.payment_mode}

    update_data = payload.dict(exclude_none=True)
    payee_name = update_data.pop("payee_name", None)

    for field, value in update_data.items():
        if field == "payment_mode" and value:
            value = norm_mode(value)
        if field == "payment_to" and value:
            value = norm_to(value)
        setattr(payment, field, value)

    # Rebuild bundled remarks if payee_name or remarks changed
    if payee_name is not None or "remarks" in update_data:
        existing_remarks = payment.remarks or ""
        clean_remarks = existing_remarks
        if existing_remarks.startswith("[Payee: "):
            end_idx = existing_remarks.find("] ")
            if end_idx != -1:
                clean_remarks = existing_remarks[end_idx + 2:]
        new_payee = payee_name if payee_name is not None else (
            existing_remarks[8:existing_remarks.find("] ")] if existing_remarks.startswith("[Payee: ") else "Unknown"
        )
        new_remarks_text = update_data.get("remarks", clean_remarks)
        payment.remarks = f"[Payee: {new_payee}] {new_remarks_text}".strip()

    try:
        record_dashboard_event(
            db, current_admin,
            action="updated payment out",
            table_name="payment_out",
            record_id=payment.id,
            message=f"Payment OUT {payment_id} was updated",
            preference_key="updated",
            old_values=old_values,
            new_values={"amount": float(payment.amount), "payment_mode": payment.payment_mode},
        )
        db.commit()
        db.refresh(payment)
        return {"status": "success", "id": str(payment.id)}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{payment_id}", status_code=200)
def delete_payment_out(
    payment_id: UUID,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    payment = db.query(PaymentOut).filter(PaymentOut.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment OUT record not found")

    try:
        record_dashboard_event(
            db, current_admin,
            action="deleted payment out",
            table_name="payment_out",
            record_id=payment.id,
            message=f"Payment OUT {payment_id} was deleted",
            preference_key="deleted",
            old_values={"amount": float(payment.amount)},
        )
        db.delete(payment)
        db.commit()
        return {"status": "success", "message": "Payment OUT deleted"}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))
