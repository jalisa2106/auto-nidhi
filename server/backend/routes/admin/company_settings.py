from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import MasterCompanyProfile, SystemUser
from backend.utils import get_current_staff, get_current_admin, record_dashboard_event

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
    """Fetch the latest company profile record."""
    profile = db.query(MasterCompanyProfile).order_by(MasterCompanyProfile.updated_at.desc()).first()
    if not profile:
        return {}
    return _serialize(profile)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_company_profile(
    payload: CompanyProfileCreate,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    """Create company profile. Only one record is expected."""
    existing = db.query(MasterCompanyProfile).first()
    if existing:
        # Instead of failing, update the latest one to prevent UI from being stuck
        latest = db.query(MasterCompanyProfile).order_by(MasterCompanyProfile.updated_at.desc()).first()
        old_values = _serialize(latest)
        for field, value in payload.dict().items():
            setattr(latest, field, value)
        try:
            record_dashboard_event(
                db,
                current_admin,
                action="updated company profile",
                table_name="master_company_profile",
                record_id=latest.id,
                message=f"Company profile {latest.company_name} was updated",
                preference_key="updated",
                old_values=old_values,
                new_values=_serialize(latest),
            )
            db.commit()
            db.refresh(latest)
            return _serialize(latest)
        except Exception as exc:
            db.rollback()
            raise HTTPException(status_code=400, detail=str(exc))
    profile = MasterCompanyProfile(**payload.dict())
    db.add(profile)
    try:
        db.flush()
        record_dashboard_event(
            db,
            current_admin,
            action="created company profile",
            table_name="master_company_profile",
            record_id=profile.id,
            message=f"Company profile {profile.company_name} was added",
            preference_key="added",
            new_values=_serialize(profile),
        )
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
    current_admin: SystemUser = Depends(get_current_admin),
):
    """Update the company profile by its UUID."""
    profile = db.query(MasterCompanyProfile).filter(MasterCompanyProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Company profile not found")

    old_values = _serialize(profile)
    for field, value in payload.dict().items():
        setattr(profile, field, value)

    try:
        record_dashboard_event(
            db,
            current_admin,
            action="updated company profile",
            table_name="master_company_profile",
            record_id=profile.id,
            message=f"Company profile {profile.company_name} was updated",
            preference_key="updated",
            old_values=old_values,
            new_values=_serialize(profile),
        )
        db.commit()
        db.refresh(profile)
        return _serialize(profile)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))
