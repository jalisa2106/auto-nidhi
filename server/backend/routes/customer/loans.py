from typing import Optional
from uuid import UUID
import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.database import get_db
from backend.models import FileRecord, FinanceInfo, SystemUser, Customer
from backend.utils import get_current_customer, get_customer_for_user, record_dashboard_event

router = APIRouter(prefix="/api/v1/portal/loans", tags=["Customer Loans"])


class LoanCreate(BaseModel):
    bank_id: Optional[UUID] = None
    file_type: Optional[str] = "new_vehicle"
    remarks: Optional[str] = None
    loan_amount: Optional[float] = None


def _get_customer_by_user(db: Session, current_user: SystemUser) -> Optional[Customer]:
    return get_customer_for_user(current_user, db)


def generate_file_number(db: Session) -> str:
    current_year = datetime.datetime.now().year
    prefix = f"FILE/{current_year}/"

    highest_file = db.query(FileRecord).filter(
        FileRecord.file_number.like(f"{prefix}%")
    ).order_by(FileRecord.file_number.desc()).first()

    if highest_file and highest_file.file_number.startswith(prefix):
        try:
            last_seq = int(highest_file.file_number.split('/')[-1])
            new_seq = last_seq + 1
        except Exception:
            new_seq = 1
    else:
        new_seq = 1

    return f"{prefix}{new_seq:03d}"


@router.get("/")
def list_customer_loans(
    current_user: SystemUser = Depends(get_current_customer),
    db: Session = Depends(get_db),
    page: int = 1,
    limit: int = 20,
):
    """Return vehicle loan files for the logged-in customer."""
    customer = _get_customer_by_user(db, current_user)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer profile not found")

    query = db.query(FileRecord).filter(
        FileRecord.is_deleted == False,
        FileRecord.customer_id == customer.id,
        or_(
            FileRecord.file_type.ilike("%vehicle%"),
            FileRecord.file_type.ilike("%loan%"),
        ),
    )

    total = query.count()
    files = query.order_by(FileRecord.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    return {
        "data": [
            {
                "id": str(f.id),
                "file_number": f.file_number,
                "file_type": f.file_type,
                "status": f.status,
                "finance_bank": f.finance_info.bank.bank_name if f.finance_info and f.finance_info.bank else None,
                "loan_amount": float(f.finance_info.loan_amount) if f.finance_info and f.finance_info.loan_amount is not None else None,
                "created_at": f.created_at.isoformat() if hasattr(f.created_at, "isoformat") else str(f.created_at) if f.created_at else None,
            }
            for f in files
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get("/{file_id}")
def customer_loan_detail(
    file_id: UUID,
    current_user: SystemUser = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    customer = _get_customer_by_user(db, current_user)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer profile not found")

    file = db.query(FileRecord).filter(
        FileRecord.id == file_id,
        FileRecord.is_deleted == False,
        FileRecord.customer_id == customer.id,
    ).first()

    if not file:
        raise HTTPException(status_code=404, detail="Loan file not found")

    finance = file.finance_info

    return {
        "id": str(file.id),
        "file_number": file.file_number,
        "file_type": file.file_type,
        "status": file.status,
        "remarks": file.remarks,
        "loan_amount": float(finance.loan_amount) if finance and finance.loan_amount is not None else None,
        "emi_amount": float(finance.emi_amount) if finance and finance.emi_amount is not None else None,
        "bank": finance.bank.bank_name if finance and finance.bank else None,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_customer_loan(
    payload: LoanCreate,
    current_user: SystemUser = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    """Create a new loan file for the logged-in customer."""
    customer = _get_customer_by_user(db, current_user)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer profile not found")

    new_file_num = generate_file_number(db)

    new_file = FileRecord(
        customer_id=customer.id,
        created_by_user_id=current_user.id,
        assigned_to=current_user.id,
        file_number=new_file_num,
        file_type=payload.file_type or "new_vehicle",
        status="draft",
        remarks=payload.remarks,
    )
    db.add(new_file)
    db.flush()

    # Create finance info if bank or loan amount provided
    if payload.bank_id or payload.loan_amount is not None:
        fin = FinanceInfo(
            file_id=new_file.id,
            bank_id=payload.bank_id,
            loan_amount=payload.loan_amount,
        )
        db.add(fin)

    try:
        record_dashboard_event(
            db,
            current_user,
            action="customer created loan",
            table_name="file_record",
            record_id=new_file.id,
            message=f"Customer {current_user.email} created loan {new_file_num}",
            preference_key="added",
            new_values={
                "id": str(new_file.id),
                "file_number": new_file.file_number,
                "file_type": new_file.file_type,
            },
        )
        db.commit()
        db.refresh(new_file)
        return {"status": "success", "id": str(new_file.id), "file_number": new_file.file_number}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))
