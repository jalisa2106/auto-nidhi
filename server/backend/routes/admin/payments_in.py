from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.utils import get_current_admin

router = APIRouter(prefix="/api/v1/payments/in", tags=["Admin Payments IN"])


class PaymentInCreate(BaseModel):
    file_id: UUID
    payment_amount: float
    paid_amount: Optional[float] = None
    remaining_amount: Optional[float] = None
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


class PaymentInOut(BaseModel):
    id: UUID
    file_id: UUID
    payment_amount: float
    paid_amount: Optional[float] = None
    remaining_amount: Optional[float] = None
    payment_mode: str
    payment_date: date
    payment_from: Optional[str] = None
    remarks: Optional[str] = None
    utr_no: Optional[str] = None

    class Config:
        orm_mode = True


@router.get("/", response_model=List[PaymentInOut])
def list_payments_in(
    page: int = 1,
    limit: int = 20,
    file_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    query = "SELECT id, file_id, payment_amount, paid_amount, remaining_amount, payment_mode, payment_date, payment_from, remarks, utr_no FROM payment_in"
    params = {}
    if file_id:
        query += " WHERE file_id = :file_id"
        params["file_id"] = str(file_id)
    query += " ORDER BY payment_date DESC LIMIT :limit OFFSET :offset"
    params["limit"] = limit
    params["offset"] = (page - 1) * limit

    result = db.execute(text(query), params)
    return [dict(row) for row in result.mappings().all()]


@router.post("/", response_model=PaymentInOut, status_code=status.HTTP_201_CREATED)
def create_payment_in(
    payload: PaymentInCreate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    insert_sql = text(
        """
        INSERT INTO payment_in (
            file_id, payment_amount, paid_amount, remaining_amount,
            payment_mode, payment_date, payment_from, cheque_bank_name,
            branch_name, cheque_no, cheque_date, utr_no, company_bank_id,
            remarks
        ) VALUES (
            :file_id, :payment_amount, :paid_amount, :remaining_amount,
            :payment_mode, :payment_date, :payment_from, :cheque_bank_name,
            :branch_name, :cheque_no, :cheque_date, :utr_no, :company_bank_id,
            :remarks
        ) RETURNING id, file_id, payment_amount, paid_amount, remaining_amount,
                  payment_mode, payment_date, payment_from, remarks, utr_no
        """
    )

    params = {
        "file_id": str(payload.file_id),
        "payment_amount": payload.payment_amount,
        "paid_amount": payload.paid_amount,
        "remaining_amount": payload.remaining_amount,
        "payment_mode": payload.payment_mode,
        "payment_date": payload.payment_date,
        "payment_from": payload.payment_from,
        "cheque_bank_name": payload.cheque_bank_name,
        "branch_name": payload.branch_name,
        "cheque_no": payload.cheque_no,
        "cheque_date": payload.cheque_date,
        "utr_no": payload.utr_no,
        "company_bank_id": str(payload.company_bank_id) if payload.company_bank_id else None,
        "remarks": payload.remarks,
    }

    try:
        result = db.execute(insert_sql, params)
        db.commit()
        created = result.mappings().first()
        if not created:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create payment")
        return dict(created)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
