import re
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, validator
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import MasterCompanyBank

router = APIRouter(prefix="/api/v1/settings/banks", tags=["Settings - Bank Accounts"])

IFSC_PATTERN = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")


# ── Pydantic Schemas ────────────────────────────────────────────────────────

class BankAccountCreate(BaseModel):
    bank_name: str
    account_number: str
    ifsc_code: str
    area: Optional[str] = None

    @validator("bank_name")
    def validate_bank_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Bank name is required")
        return v

    @validator("account_number")
    def validate_account_number(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Account number is required")
        if len(v) < 9 or len(v) > 18:
            raise ValueError("Account number must be between 9 and 18 characters")
        return v

    @validator("ifsc_code")
    def validate_ifsc(cls, v: str) -> str:
        v = v.strip().upper()
        if not IFSC_PATTERN.match(v):
            raise ValueError("Invalid IFSC code format (e.g. HDFC0001234)")
        return v


class BankAccountUpdate(BaseModel):
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    area: Optional[str] = None

    @validator("bank_name")
    def validate_bank_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Bank name cannot be empty")
        return v

    @validator("account_number")
    def validate_account_number(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Account number cannot be empty")
            if len(v) < 9 or len(v) > 18:
                raise ValueError("Account number must be between 9 and 18 characters")
        return v

    @validator("ifsc_code")
    def validate_ifsc(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().upper()
            if not IFSC_PATTERN.match(v):
                raise ValueError("Invalid IFSC code format (e.g. HDFC0001234)")
        return v


# ── Helper: serialize a bank record ────────────────────────────────────────

def _serialize(b: MasterCompanyBank) -> dict:
    return {
        "id": str(b.id),
        "bank_name": b.bank_name,
        "account_number": b.account_number,
        "ifsc_code": b.ifsc_code,
        "area": b.area,
    }


# ── Routes ──────────────────────────────────────────────────────────────────

@router.get("/")
def list_bank_accounts(
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """List all company bank accounts (paginated)."""
    query = db.query(MasterCompanyBank)
    total = query.count()
    banks = query.order_by(MasterCompanyBank.bank_name).offset((page - 1) * limit).limit(limit).all()
    return {
        "data": [_serialize(b) for b in banks],
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_bank_account(payload: BankAccountCreate, db: Session = Depends(get_db)):
    """Create a new company bank account."""
    # Check for duplicate account number
    existing = db.query(MasterCompanyBank).filter(
        MasterCompanyBank.account_number == payload.account_number
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A bank account with this account number already exists",
        )

    bank = MasterCompanyBank(
        bank_name=payload.bank_name,
        account_number=payload.account_number,
        ifsc_code=payload.ifsc_code.upper(),
        area=payload.area,
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
def update_bank_account(
    bank_id: UUID,
    payload: BankAccountUpdate,
    db: Session = Depends(get_db),
):
    """Update an existing bank account by UUID."""
    bank = db.query(MasterCompanyBank).filter(MasterCompanyBank.id == bank_id).first()
    if not bank:
        raise HTTPException(status_code=404, detail="Bank account not found")

    # Check for duplicate account number only if it's being changed
    if payload.account_number and payload.account_number != bank.account_number:
        conflict = db.query(MasterCompanyBank).filter(
            MasterCompanyBank.account_number == payload.account_number,
            MasterCompanyBank.id != bank_id,
        ).first()
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Another bank account with this account number already exists",
            )

    update_data = payload.dict(exclude_none=True)
    for field, value in update_data.items():
        if field == "ifsc_code" and value:
            value = value.upper()
        setattr(bank, field, value)

    try:
        db.commit()
        db.refresh(bank)
        return _serialize(bank)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{bank_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bank_account(bank_id: UUID, db: Session = Depends(get_db)):
    """Delete a company bank account by UUID."""
    bank = db.query(MasterCompanyBank).filter(MasterCompanyBank.id == bank_id).first()
    if not bank:
        raise HTTPException(status_code=404, detail="Bank account not found")

    try:
        db.delete(bank)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Cannot delete: this bank account may be referenced by existing payment records",
        )
