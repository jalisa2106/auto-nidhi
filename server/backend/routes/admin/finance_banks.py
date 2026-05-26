from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, validator
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import MasterBank

router = APIRouter(prefix="/api/v1/finance-banks", tags=["Finance Banks"])


# ── Pydantic Schemas ────────────────────────────────────────────────────────

class FinanceBankCreate(BaseModel):
    bank_name: str
    area: Optional[str] = None
    contact_no: Optional[str] = None

    @validator("bank_name")
    def validate_bank_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Bank name is required")
        return v

    @validator("contact_no")
    def validate_contact_no(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if v and not v.replace("+", "").replace("-", "").replace(" ", "").isdigit():
                raise ValueError("Contact number must contain only digits")
        return v or None


class FinanceBankUpdate(BaseModel):
    bank_name: Optional[str] = None
    area: Optional[str] = None
    contact_no: Optional[str] = None

    @validator("bank_name")
    def validate_bank_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Bank name cannot be empty")
        return v


# ── Helper ──────────────────────────────────────────────────────────────────

def _serialize(b: MasterBank) -> dict:
    return {
        "id": str(b.id),
        "bank_name": b.bank_name,
        "area": b.area,
        "contact_no": b.contact_no,
    }


# ── Routes ──────────────────────────────────────────────────────────────────

@router.get("/")
def list_finance_banks(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all finance banks (paginated, searchable)."""
    query = db.query(MasterBank)
    if search:
        term = f"%{search}%"
        query = query.filter(
            MasterBank.bank_name.ilike(term) | MasterBank.area.ilike(term)
        )
    total = query.count()
    banks = (
        query.order_by(MasterBank.bank_name)
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return {"data": [_serialize(b) for b in banks], "total": total, "page": page, "limit": limit}


@router.get("/all")
def list_all_finance_banks(db: Session = Depends(get_db)):
    """Return all finance banks (for dropdowns — no pagination)."""
    banks = db.query(MasterBank).order_by(MasterBank.bank_name).all()
    return {"data": [_serialize(b) for b in banks]}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_finance_bank(payload: FinanceBankCreate, db: Session = Depends(get_db)):
    """Create a new finance bank."""
    # Check duplicate name
    existing = db.query(MasterBank).filter(
        MasterBank.bank_name.ilike(payload.bank_name.strip())
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A bank with this name already exists",
        )
    bank = MasterBank(
        bank_name=payload.bank_name.strip(),
        area=payload.area.strip() if payload.area else None,
        contact_no=payload.contact_no,
    )
    db.add(bank)
    try:
        db.commit()
        db.refresh(bank)
        return _serialize(bank)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/{bank_id}")
def update_finance_bank(
    bank_id: UUID,
    payload: FinanceBankUpdate,
    db: Session = Depends(get_db),
):
    """Update an existing finance bank."""
    bank = db.query(MasterBank).filter(MasterBank.id == bank_id).first()
    if not bank:
        raise HTTPException(status_code=404, detail="Finance bank not found")

    update_data = payload.dict(exclude_none=True)
    for field, value in update_data.items():
        setattr(bank, field, value.strip() if isinstance(value, str) else value)

    try:
        db.commit()
        db.refresh(bank)
        return _serialize(bank)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{bank_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_finance_bank(bank_id: UUID, db: Session = Depends(get_db)):
    """Delete a finance bank (fails if linked to loans)."""
    bank = db.query(MasterBank).filter(MasterBank.id == bank_id).first()
    if not bank:
        raise HTTPException(status_code=404, detail="Finance bank not found")
    try:
        db.delete(bank)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Cannot delete: this bank is linked to existing loan records",
        )
