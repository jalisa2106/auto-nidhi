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


# ─────────────────────────────────────────────
# GET ALL EXPENSES
# ─────────────────────────────────────────────
@router.get("/api/expenses")
def get_expenses(db: Session = Depends(get_db)):
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
def create_expense(payload: ExpenseCreate, db: Session = Depends(get_db)):
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
def update_expense(expense_id: str, payload: ExpenseUpdate, db: Session = Depends(get_db)):
    try:
        expense = db.query(ExpenseLedger).filter(
            ExpenseLedger.id == expense_id,
            ExpenseLedger.is_deleted == False
        ).first()

        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")

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

        db.commit()

        return {"message": "Expense updated"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# SOFT DELETE
# ─────────────────────────────────────────────
@router.delete("/api/expenses/{expense_id}")
def delete_expense(expense_id: str, db: Session = Depends(get_db)):
    try:
        expense = db.query(ExpenseLedger).filter(
            ExpenseLedger.id == expense_id,
            ExpenseLedger.is_deleted == False
        ).first()

        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")

        expense.is_deleted = True
        db.commit()

        return {"message": "Expense deleted (soft)"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))