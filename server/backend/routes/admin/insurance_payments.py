from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import date
from backend.database import get_db
from backend.models import InsurancePayment, FileRecord, MasterCompanyBank, MasterInsuranceCompany
from backend.utils import get_current_admin

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
def create_insurance_payment(payload: InsurancePaymentCreate, db: Session = Depends(get_db)):
    new_payment = InsurancePayment(**payload.dict())
    db.add(new_payment)
    db.commit()
    db.refresh(new_payment)
    return new_payment

@router.patch("/{payment_id}/delete")
def soft_delete(payment_id: UUID, db: Session = Depends(get_db)):
    payment = db.query(InsurancePayment).filter(InsurancePayment.id == payment_id).first()
    if not payment: raise HTTPException(status_code=404)
    payment.is_deleted = True
    db.commit()
    return {"status": "success"}