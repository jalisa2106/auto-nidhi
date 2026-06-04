from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, contains_eager
from sqlalchemy import or_
from typing import Optional

from backend.database import get_db
from backend.models import Customer, FileRecord, FinanceInfo, MasterBank, SystemUser
from backend.utils import get_current_staff, get_current_admin, record_dashboard_event

router = APIRouter(prefix="/api/v1/loans", tags=["Admin Loans"])

LOAN_STATUSES = ["disbursed", "completed", "cancelled"]


def loans_query(db: Session, eager: bool = False):
    query = (
        db.query(FileRecord)
        .join(FileRecord.customer)
        .join(FileRecord.finance_info)
        .join(FinanceInfo.bank)
        .outerjoin(FileRecord.creator)
        .filter(FileRecord.is_deleted == False)
        .filter(FileRecord.status.in_(LOAN_STATUSES))
    )

    if eager:
        query = query.options(
            contains_eager(FileRecord.customer),
            contains_eager(FileRecord.finance_info).contains_eager(FinanceInfo.bank),
            contains_eager(FileRecord.creator),
        )

    return query


def serialize_loan(file: FileRecord):
    finance = file.finance_info
    customer = file.customer
    bank = finance.bank if finance else None
    creator = file.creator

    return {
        "file_number": file.file_number,
        "docket_date": file.docket_date.isoformat() if hasattr(file.docket_date, "isoformat") else str(file.docket_date) if file.docket_date else None,
        "status": file.status,
        "remarks": file.remarks or "",
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
        "total": loans_query(db).count(),
        "running": loans_query(db).filter(FileRecord.status == "disbursed").count(),
        "completed": loans_query(db).filter(FileRecord.status == "completed").count(),
        "premature": loans_query(db).filter(FileRecord.status == "cancelled").count(),
    }


@router.get("/")
def list_loans(
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_staff),
):
    query = loans_query(db, eager=True)

    if status and status != "All":
        query = query.filter(FileRecord.status == status)

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                FileRecord.file_number.ilike(term),
                FinanceInfo.lan_number.ilike(term),
                Customer.full_name.ilike(term),
                MasterBank.bank_name.ilike(term),
            )
        )

    files = query.order_by(FileRecord.docket_date.desc()).all()

    return {
        "message": "Loans fetched successfully",
        "stats": get_loan_stats(db),
        "data": [serialize_loan(file) for file in files],
    }


@router.get("/stats/")
def loan_stats(
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_staff),
):
    return get_loan_stats(db)


@router.patch("/{file_number}")
def update_loan(
    file_number: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_staff),
):
    loan = (
        loans_query(db)
        .filter(FileRecord.file_number == file_number)
        .first()
    )
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    old_values = serialize_loan(loan)

    if "status" in payload and payload["status"] is not None:
        loan.status = payload["status"]

    if "remarks" in payload:
        loan.remarks = payload["remarks"]

    record_dashboard_event(
        db,
        current_admin,
        action="updated loan",
        table_name="file_record",
        record_id=loan.id,
        message=f"Loan file {loan.file_number} was updated",
        preference_key="updated",
        old_values=old_values,
        new_values=serialize_loan(loan),
    )
    db.commit()
    db.refresh(loan)

    return {
        "message": "Loan updated successfully",
        "data": serialize_loan(loan),
    }


def delete_loan_record(
    file_number: str,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_staff),
):
    loan = (
        loans_query(db)
        .filter(FileRecord.file_number == file_number)
        .first()
    )
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    old_values = serialize_loan(loan)
    loan.is_deleted = True
    loan.status = "cancelled"

    record_dashboard_event(
        db,
        current_admin,
        action="deleted loan",
        table_name="file_record",
        record_id=loan.id,
        message=f"Loan file {loan.file_number} was deleted",
        preference_key="deleted",
        old_values=old_values,
    )
    db.commit()
    db.refresh(loan)

    return {
        "message": "Loan soft deleted successfully",
        "data": serialize_loan(loan),
    }


@router.delete("/{file_number}")
def delete_loan(
    file_number: str,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    return delete_loan_record(file_number, db, current_admin)
