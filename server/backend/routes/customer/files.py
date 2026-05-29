from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Customer, FileRecord, SystemUser
from backend.utils import get_current_customer

router = APIRouter(prefix="/api/v1/portal", tags=["Customer Portal"])


def _get_customer_by_user(db: Session, current_user: SystemUser) -> Optional[Customer]:
    return db.query(Customer).filter(Customer.email == current_user.email).first()


@router.get("/files")
def customer_file_list(
    current_user: SystemUser = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    customer = _get_customer_by_user(db, current_user)

    query = db.query(FileRecord).filter(FileRecord.is_deleted == False)
    if customer:
        query = query.filter(
            or_(
                FileRecord.created_by_user_id == current_user.id,
                FileRecord.customer_id == customer.id,
            )
        )
    else:
        query = query.filter(FileRecord.created_by_user_id == current_user.id)

    files = query.order_by(FileRecord.created_at.desc()).all()

    return [
        {
            "id": str(f.id),
            "file_number": f.file_number,
            "file_type": f.file_type,
            "status": f.status,
            "assigned_to": f.assignee.first_name if f.assignee else None,
            "customer_name": f.customer.full_name if f.customer else None,
            "finance_amount": float(f.finance_info.loan_amount) if f.finance_info and f.finance_info.loan_amount is not None else None,
            "finance_bank": f.finance_info.bank.bank_name if f.finance_info and f.finance_info.bank else None,
            "created_at": f.created_at.isoformat() if f.created_at else None,
            "updated_at": f.updated_at.isoformat() if f.updated_at else None,
        }
        for f in files
    ]


@router.get("/files/{file_id}")
def customer_file_detail(
    file_id: str,
    current_user: SystemUser = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    customer = _get_customer_by_user(db, current_user)

    query = db.query(FileRecord).filter(FileRecord.id == file_id, FileRecord.is_deleted == False)
    if customer:
        query = query.filter(
            or_(
                FileRecord.created_by_user_id == current_user.id,
                FileRecord.customer_id == customer.id,
            )
        )
    else:
        query = query.filter(FileRecord.created_by_user_id == current_user.id)

    file = query.first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    return {
        "id": str(file.id),
        "file_number": file.file_number,
        "file_type": file.file_type,
        "status": file.status,
        "assigned_to": file.assignee.first_name if file.assignee else None,
        "customer_name": file.customer.full_name if file.customer else None,
        "customer_email": file.customer.email if file.customer else None,
        "remarks": file.remarks,
        "finance_amount": float(file.finance_info.loan_amount) if file.finance_info and file.finance_info.loan_amount is not None else None,
        "finance_bank": file.finance_info.bank.bank_name if file.finance_info and file.finance_info.bank else None,
        "created_at": file.created_at.isoformat() if file.created_at else None,
        "updated_at": file.updated_at.isoformat() if file.updated_at else None,
    }
