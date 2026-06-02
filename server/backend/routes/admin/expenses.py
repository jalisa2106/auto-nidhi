from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime

from backend.database import get_db
from backend.models import (
    ExpenseLedger,
    MasterExpenseCategory,
    FileRecord,
    SystemUser
)
from backend.utils import get_current_admin, get_current_staff, record_dashboard_event

router = APIRouter(tags=["Admin Expenses"])

# ─────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────

class ExpenseCreate(BaseModel):
    amount: float
    expense_date: str
    remarks: Optional[str] = None
    expense_category_id: str
    file_id: Optional[str] = None
    created_by: str 


class ExpenseUpdate(BaseModel):
    amount: Optional[float]
    expense_date: Optional[str]
    remarks: Optional[str]
    expense_category_id: Optional[str]
    file_id: Optional[str]
    created_by: Optional[str]


def _serialize_expense(expense: ExpenseLedger) -> dict:
    return {
        "id": str(expense.id),
        "amount": float(expense.amount or 0),
        "expense_date": str(expense.expense_date) if expense.expense_date else None,
        "remarks": expense.remarks,
        "expense_category_id": str(expense.expense_category_id) if expense.expense_category_id else None,
        "file_id": str(expense.file_id) if expense.file_id else None,
        "created_by": str(expense.created_by) if expense.created_by else None,
        "is_deleted": bool(expense.is_deleted),
    }


# ─────────────────────────────────────────────
# GET ALL EXPENSES
# ─────────────────────────────────────────────
@router.get("/api/expenses")
def get_expenses(
    db: Session = Depends(get_db),
    current_user: SystemUser = Depends(get_current_staff),
):
    expenses = (
        db.query(
            ExpenseLedger,
            MasterExpenseCategory.expense_name.label("expense_category_name"),
            FileRecord.file_number,
            SystemUser.first_name,
            SystemUser.last_name
        )
        .join(MasterExpenseCategory, MasterExpenseCategory.id == ExpenseLedger.expense_category_id)
        .join(SystemUser, SystemUser.id == ExpenseLedger.created_by)
        .outerjoin(FileRecord, FileRecord.id == ExpenseLedger.file_id)
        .filter(ExpenseLedger.is_deleted == False)
        .order_by(ExpenseLedger.expense_date.desc())
        .all()
    )

    result = []

    for e, category_name, file_number, first_name, last_name in expenses:
        result.append({
            "id": str(e.id),
            "amount": float(e.amount),
            "expense_date": str(e.expense_date),
            "remarks": e.remarks,
            "created_at": str(e.created_at),
            "expense_category_name": category_name,
            "file_number": file_number or "",
            "created_by_name": f"{first_name} {last_name or ''}".strip()
        })

    return result


# ─────────────────────────────────────────────
# CREATE EXPENSE
# ─────────────────────────────────────────────
@router.post("/api/expenses")
def create_expense(
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: SystemUser = Depends(get_current_staff),
):
    try:
        # category
        category = db.query(MasterExpenseCategory).filter(
            MasterExpenseCategory.id == payload.expense_category_id
        ).first()

        if not category:
            raise HTTPException(status_code=404, detail="Category not found")

        # file (optional)
        file_obj = None
        if payload.file_id:
            file_obj = db.query(FileRecord).filter(
                FileRecord.id == payload.file_id
            ).first()

        # user (by name — same as your frontend design)
        user = db.query(SystemUser).filter(
            SystemUser.id == payload.created_by
        ).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        new_expense = ExpenseLedger(
            id=uuid.uuid4(),
            amount=payload.amount,
            expense_date=payload.expense_date,
            remarks=payload.remarks,
            expense_category_id=category.id,
            file_id=file_obj.id if file_obj else None,
            created_by=user.id,
            created_at=datetime.utcnow(),
            is_deleted=False
        )

        db.add(new_expense)
        db.flush()
        record_dashboard_event(
            db,
            current_user,
            action="created expense",
            table_name="expense_ledger",
            record_id=new_expense.id,
            message=f"Expense of {new_expense.amount} was added under {category.expense_name}",
            preference_key="added",
            new_values=_serialize_expense(new_expense),
        )
        db.commit()
        db.refresh(new_expense)

        return {"message": "Expense created", "id": str(new_expense.id)}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# UPDATE EXPENSE
# ─────────────────────────────────────────────
@router.patch("/api/expenses/{expense_id}")
def update_expense(
    expense_id: str,
    payload: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: SystemUser = Depends(get_current_staff),
):
    try:
        expense = db.query(ExpenseLedger).filter(
            ExpenseLedger.id == expense_id,
            ExpenseLedger.is_deleted == False
        ).first()

        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")

        old_values = _serialize_expense(expense)

        if payload.amount is not None:
            expense.amount = payload.amount

        if payload.expense_date is not None:
            expense.expense_date = payload.expense_date

        if payload.remarks is not None:
            expense.remarks = payload.remarks

        if payload.expense_category_id:
            category = db.query(MasterExpenseCategory).filter(
                MasterExpenseCategory.id == payload.expense_category_id
            ).first()
            if category:
                expense.expense_category_id = category.id

        if payload.file_id is not None:
            file_obj = db.query(FileRecord).filter(
                FileRecord.id == payload.file_id
            ).first()
            expense.file_id = file_obj.id if file_obj else None

        if payload.created_by:
            user = db.query(SystemUser).filter(
                SystemUser.id == payload.created_by
            ).first()
            if user:
                expense.created_by = user.id

        record_dashboard_event(
            db,
            current_user,
            action="updated expense",
            table_name="expense_ledger",
            record_id=expense.id,
            message=f"Expense of {expense.amount} was updated",
            preference_key="updated",
            old_values=old_values,
            new_values=_serialize_expense(expense),
        )
        db.commit()

        return {"message": "Expense updated"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# SOFT DELETE
# ─────────────────────────────────────────────
@router.delete("/api/expenses/{expense_id}")
def delete_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    try:
        expense = db.query(ExpenseLedger).filter(
            ExpenseLedger.id == expense_id,
            ExpenseLedger.is_deleted == False
        ).first()

        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")

        old_values = _serialize_expense(expense)
        expense.is_deleted = True
        record_dashboard_event(
            db,
            current_admin,
            action="deleted expense",
            table_name="expense_ledger",
            record_id=expense.id,
            message=f"Expense of {expense.amount} was deleted",
            preference_key="deleted",
            old_values=old_values,
        )
        db.commit()

        return {"message": "Expense deleted (soft)"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
