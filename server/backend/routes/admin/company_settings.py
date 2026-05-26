from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import MasterCompanyProfile

router = APIRouter(prefix="/api/v1/settings/company", tags=["Settings - Company"])


# ── Pydantic Schemas ────────────────────────────────────────────────────────

class CompanyProfileBase(BaseModel):
    company_name: str
    address_1: str
    address_2: Optional[str] = None
    mobile_no: str
    phone_no: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    email_address: Optional[str] = None
    fax_no: Optional[str] = None
    website: Optional[str] = None
    contact_person_1: Optional[str] = None
    contact_person_2: Optional[str] = None
    tin_no: Optional[str] = None
    gst_no: Optional[str] = None
    cst_no: Optional[str] = None
    pan_no: Optional[str] = None
    insurance_expiry_notification: Optional[str] = None
    opening_balance: Optional[float] = None


class CompanyProfileCreate(CompanyProfileBase):
    pass


class CompanyProfileUpdate(CompanyProfileBase):
    pass


# ── Helper: serialize a profile row ────────────────────────────────────────

def _serialize(p: MasterCompanyProfile) -> dict:
    return {
        "id": str(p.id),
        "company_name": p.company_name,
        "address_1": p.address_1,
        "address_2": p.address_2,
        "mobile_no": p.mobile_no,
        "phone_no": p.phone_no,
        "country": p.country,
        "state": p.state,
        "city": p.city,
        "pincode": p.pincode,
        "email_address": p.email_address,
        "fax_no": p.fax_no,
        "website": p.website,
        "contact_person_1": p.contact_person_1,
        "contact_person_2": p.contact_person_2,
        "tin_no": p.tin_no,
        "gst_no": p.gst_no,
        "cst_no": p.cst_no,
        "pan_no": p.pan_no,
        "insurance_expiry_notification": p.insurance_expiry_notification,
        "opening_balance": float(p.opening_balance) if p.opening_balance is not None else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


# ── Routes ──────────────────────────────────────────────────────────────────

@router.get("/")
def get_company_profile(db: Session = Depends(get_db)):
    """Fetch the first (and only) company profile record."""
    profile = db.query(MasterCompanyProfile).first()
    if not profile:
        return {}
    return _serialize(profile)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_company_profile(payload: CompanyProfileCreate, db: Session = Depends(get_db)):
    """Create company profile. Only one record is expected."""
    existing = db.query(MasterCompanyProfile).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Company profile already exists. Use PUT to update.",
        )
    profile = MasterCompanyProfile(**payload.dict())
    db.add(profile)
    try:
        db.commit()
        db.refresh(profile)
        return _serialize(profile)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/{profile_id}")
def update_company_profile(
    profile_id: UUID,
    payload: CompanyProfileUpdate,
    db: Session = Depends(get_db),
):
    """Update the company profile by its UUID."""
    profile = db.query(MasterCompanyProfile).filter(MasterCompanyProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Company profile not found")

    for field, value in payload.dict().items():
        setattr(profile, field, value)

    try:
        db.commit()
        db.refresh(profile)
        return _serialize(profile)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))
