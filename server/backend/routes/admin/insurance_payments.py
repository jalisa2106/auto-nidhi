from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import date
from backend.database import get_db
from backend.models import InsurancePayment, FileRecord, MasterCompanyBank, MasterInsuranceCompany, SystemUser
from backend.utils import get_current_admin, record_dashboard_event

router = APIRouter(prefix="/api/v1/insurance-payments", tags=["Admin Insurance Payments"])

class InsurancePaymentCreate(BaseModel):
    file_id: UUID
    payment_date: date
    payment_mode: str
    amount: float
    insurance_company_id: UUID
    valid_to: Optional[date] = None
    company_bank_id: Optional[UUID] = None
    cheque_bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    cheque_no: Optional[str] = None
    cheque_date: Optional[date] = None
    utr_no: Optional[str] = None
    remarks: Optional[str] = None

def _serialize(payment: InsurancePayment) -> dict:
    return {
        "id": str(payment.id),
        "file_id": str(payment.file_id),
        "payment_date": str(payment.payment_date),
        "payment_mode": payment.payment_mode,
        "amount": float(payment.amount),
        "insurance_company_id": str(payment.insurance_company_id) if payment.insurance_company_id else None,
        "valid_to": str(payment.valid_to) if payment.valid_to else None,
        "is_deleted": bool(payment.is_deleted),
    }

@router.get("/")
def list_insurance_payments(db: Session = Depends(get_db)):
    payments = db.query(InsurancePayment).filter(InsurancePayment.is_deleted == False).all()
    data = []
    for p in payments:        
        data.append({
            "id": str(p.id),
            "file_id": str(p.file_id),
            "file_number": p.file.file_number if p.file else "Unknown",
            "payee_name": p.insurance_company.company_name if p.insurance_company else (p.payee_name or "Unknown Insurer"),
            "insurance_company_id": str(p.insurance_company_id) if p.insurance_company_id else None,
            "valid_to": p.valid_to.strftime("%Y-%m-%d") if p.valid_to else None,
            "amount": float(p.amount),
            "mode": p.payment_mode,
            "payment_date": p.payment_date.strftime("%Y-%m-%d"),
            "company_bank_id": str(p.company_bank_id) if hasattr(p, 'company_bank_id') else None,
            "cheque_no": p.cheque_no,
            "cheque_date": p.cheque_date.strftime("%Y-%m-%d") if p.cheque_date else None,
            "cheque_bank_name": p.cheque_bank_name,
            "branch_name": p.branch_name,
            "utr_no": p.utr_no,
            "remarks": p.remarks,
            "is_deleted": p.is_deleted
        })
    return {"data": data}

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_insurance_payment(
    payload: InsurancePaymentCreate,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    new_payment = InsurancePayment(**payload.dict())
    db.add(new_payment)
    db.flush()
    record_dashboard_event(
        db,
        current_admin,
        action="created insurance payment",
        table_name="insurance_payment",
        record_id=new_payment.id,
        message=f"Insurance payment of {new_payment.amount} was recorded",
        preference_key="added",
        new_values=_serialize(new_payment),
    )
    db.commit()
    db.refresh(new_payment)
    return new_payment

@router.patch("/{payment_id}/delete")
def soft_delete(
    payment_id: UUID,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    payment = db.query(InsurancePayment).filter(InsurancePayment.id == payment_id).first()
    if not payment: raise HTTPException(status_code=404)
    old_values = _serialize(payment)
    payment.is_deleted = True
    record_dashboard_event(
        db,
        current_admin,
        action="deleted insurance payment",
        table_name="insurance_payment",
        record_id=payment.id,
        message=f"Insurance payment of {payment.amount} was deleted",
        preference_key="deleted",
        old_values=old_values,
    )
    db.commit()
    return {"status": "success"}


class InsurancePaymentUpdate(BaseModel):
    payment_date: Optional[date] = None
    payment_mode: Optional[str] = None
    amount: Optional[float] = None
    insurance_company_id: Optional[UUID] = None
    valid_to: Optional[date] = None
    company_bank_id: Optional[UUID] = None
    cheque_bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    cheque_no: Optional[str] = None
    cheque_date: Optional[date] = None
    utr_no: Optional[str] = None
    remarks: Optional[str] = None


@router.put("/{payment_id}")
def update_insurance_payment(
    payment_id: UUID,
    payload: InsurancePaymentUpdate,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    payment = db.query(InsurancePayment).filter(
        InsurancePayment.id == payment_id,
        InsurancePayment.is_deleted == False
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Insurance payment not found")

    old_values = _serialize(payment)
    update_data = payload.dict(exclude_none=True)
    for field, value in update_data.items():
        setattr(payment, field, value)

    record_dashboard_event(
        db, current_admin,
        action="updated insurance payment",
        table_name="insurance_payment",
        record_id=payment.id,
        message=f"Insurance payment {payment_id} was updated",
        preference_key="updated",
        old_values=old_values,
        new_values=_serialize(payment),
    )
    db.commit()
    db.refresh(payment)
    return {"status": "success", "id": str(payment.id)}
