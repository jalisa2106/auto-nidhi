import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, validator
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import MasterExpenseCategory

router = APIRouter(prefix="/api/v1/expense-categories", tags=["Expense Categories"])


class ExpenseCategoryCreate(BaseModel):
    name: str

    @validator("name")
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Category name is required")
        return value


class ExpenseCategoryUpdate(BaseModel):
    name: Optional[str] = None

    @validator("name")
    def validate_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Category name cannot be empty")
        return value


def _serialize(category: MasterExpenseCategory) -> dict:
    return {
        "id": str(category.id),
        "name": category.expense_name,
    }


@router.get("/")
def list_expense_categories(search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(MasterExpenseCategory).filter(MasterExpenseCategory.is_deleted == False)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(MasterExpenseCategory.expense_name.ilike(search_term))

    rows = query.order_by(MasterExpenseCategory.expense_name).all()
    return [_serialize(row) for row in rows]


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_expense_category(payload: ExpenseCategoryCreate, db: Session = Depends(get_db)):
    existing = db.query(MasterExpenseCategory).filter(
        MasterExpenseCategory.expense_name.ilike(payload.name),
        MasterExpenseCategory.is_deleted == False,
    ).first()

    if existing:
        raise HTTPException(status_code=409, detail="A category with this name already exists")

    category = MasterExpenseCategory(expense_name=payload.name)
    db.add(category)

    try:
        db.commit()
        db.refresh(category)
        return _serialize(category)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/{category_id}")
def update_expense_category(category_id: UUID, payload: ExpenseCategoryUpdate, db: Session = Depends(get_db)):
    category = db.query(MasterExpenseCategory).filter(
        MasterExpenseCategory.id == category_id,
        MasterExpenseCategory.is_deleted == False,
    ).first()

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    if payload.name is not None:
        conflict = db.query(MasterExpenseCategory).filter(
            MasterExpenseCategory.expense_name.ilike(payload.name),
            MasterExpenseCategory.id != category_id,
            MasterExpenseCategory.is_deleted == False,
        ).first()

        if conflict:
            raise HTTPException(status_code=409, detail="Another category with this name already exists")

        category.expense_name = payload.name

    try:
        db.commit()
        db.refresh(category)
        return _serialize(category)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense_category(category_id: UUID, db: Session = Depends(get_db)):
    category = db.query(MasterExpenseCategory).filter(
        MasterExpenseCategory.id == category_id,
        MasterExpenseCategory.is_deleted == False,
    ).first()

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    category.is_deleted = True
    category.deleted_at = datetime.datetime.utcnow()

    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))