from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from typing import Optional

from backend.database import get_db
from backend.models import Customer, FileRecord, FinanceInfo, MasterBank, SystemUser
from backend.utils import get_current_admin

router = APIRouter(prefix="/api/v1/loans", tags=["Admin Loans"])

LOAN_STATUSES = ["disbursed", "completed", "cancelled"]

def serialize_loan(file: FileRecord):
    finance = file.finance_info
    customer = file.customer
    bank = finance.bank if finance else None
    creator = file.creator

    return {
        "file_number": file.file_number,
        "docket_date": file.docket_date.isoformat() if file.docket_date else None,
        "status": file.status,

        "lan_number": finance.lan_number if finance else "",
        "loan_amount": float(finance.loan_amount or 0) if finance else 0,
        "emi_amount": float(finance.emi_amount or 0) if finance else 0,
        "no_of_months": finance.no_of_months if finance and finance.no_of_months else 0,
        "irr_percentage": float(finance.irr_percentage or 0) if finance else 0,

        "full_name": customer.full_name if customer else "",
        "mobile_1": customer.mobile_1 if customer else "",
        "city": customer.city if customer else "",

        "bank_name": bank.bank_name if bank else "",
        "created_by_name": creator.first_name if creator else "",
    }

def get_loan_stats(db: Session):
    return {
        "total": db.query(FileRecord).filter(FileRecord.status.in_(LOAN_STATUSES)).count(),
        "running": db.query(FileRecord).filter(FileRecord.status == "disbursed").count(),
        "completed": db.query(FileRecord).filter(FileRecord.status == "completed").count(),
        "premature": db.query(FileRecord).filter(FileRecord.status == "cancelled").count(),
    }

@router.get("/")
def list_loans(
    status: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):

    query = (
        db.query(FileRecord)
        .options(
            joinedload(FileRecord.customer),
            joinedload(FileRecord.creator),
            joinedload(FileRecord.finance_info).joinedload(FinanceInfo.bank),
        )
        .filter(FileRecord.status.in_(LOAN_STATUSES))
    )

    # ---------------- status filter ----------------
    if status and status != "All":
        query = query.filter(FileRecord.status == status)

    # ---------------- search filter ----------------
    if search:
        term = f"%{search}%"

        query = query.join(FileRecord.finance_info).join(FinanceInfo.bank)

        query = query.filter(
            or_(
                FileRecord.file_number.ilike(term),
                FinanceInfo.lan_number.ilike(term),
                Customer.full_name.ilike(term),
                MasterBank.bank_name.ilike(term),
            )
        )

    # ---------------- execution ----------------
    files = query.order_by(FileRecord.docket_date.desc()).all()

    return {
        "message": "Loans fetched successfully",
        "stats": get_loan_stats(db),
        "data": [serialize_loan(file) for file in files],
    }