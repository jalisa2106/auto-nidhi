from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.database import get_db
from backend.models import SystemUser
from backend.utils import get_current_staff, get_current_admin, record_dashboard_event

router = APIRouter(prefix="/api/v1/masters", tags=["Insurance Companies"])

# ── Pydantic schemas ──────────────────────────────────────────────────────────
class InsuranceCompanyIn(BaseModel):
    company_name: str
    contact_person: Optional[str] = None
    mobile_no: Optional[str] = None
    phone_no: Optional[str] = None

class InsuranceCompanyUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    mobile_no: Optional[str] = None
    phone_no: Optional[str] = None

# ── Routes ────────────────────────────────────────────────────────────────────
@router.get("/insurance-companies")
def list_insurance_companies(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT id, company_name, contact_person, mobile_no, phone_no
        FROM master_insurance_company
        WHERE is_deleted = FALSE
        ORDER BY company_name
    """)).mappings().all()
    return [dict(r) for r in rows]

@router.post("/insurance-companies", status_code=201)
def create_insurance_company(
    data: InsuranceCompanyIn,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    result = db.execute(text("""
        INSERT INTO master_insurance_company (company_name, contact_person, mobile_no, phone_no)
        VALUES (:company_name, :contact_person, :mobile_no, :phone_no)
        RETURNING id, company_name, contact_person, mobile_no, phone_no
    """), data.model_dump())
    row = dict(result.mappings().one())
    record_dashboard_event(
        db,
        current_admin,
        action="created insurance company",
        table_name="master_insurance_company",
        record_id=row["id"],
        message=f"Insurance company {row['company_name']} was added",
        preference_key="added",
        new_values=row,
    )
    db.commit()
    return row

@router.put("/insurance-companies/{id}")
def update_insurance_company(
    id: str,
    data: InsuranceCompanyUpdate,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    existing = db.execute(text("""
        SELECT id, company_name, contact_person, mobile_no, phone_no
        FROM master_insurance_company
        WHERE id = :id
    """), {"id": id}).mappings().first()
    if not existing:
        raise HTTPException(status_code=404, detail="Insurance company not found")
    fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    set_clause = ", ".join([f"{k} = :{k}" for k in fields])
    fields["id"] = id
    result = db.execute(text(f"""
        UPDATE master_insurance_company SET {set_clause}
        WHERE id = :id
        RETURNING id, company_name, contact_person, mobile_no, phone_no
    """), fields)
    row = dict(result.mappings().one())
    record_dashboard_event(
        db,
        current_admin,
        action="updated insurance company",
        table_name="master_insurance_company",
        record_id=row["id"],
        message=f"Insurance company {row['company_name']} was updated",
        preference_key="updated",
        old_values=dict(existing),
        new_values=row,
    )
    db.commit()
    return row

@router.delete("/insurance-companies/{id}", status_code=204)
def delete_insurance_company(
    id: str,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    existing = db.execute(text("""
        SELECT id, company_name, contact_person, mobile_no, phone_no
        FROM master_insurance_company
        WHERE id = :id AND is_deleted = FALSE
    """), {"id": id}).mappings().first()
    if not existing:
        raise HTTPException(status_code=404, detail="Insurance company not found")
    db.execute(text("""
        UPDATE master_insurance_company
        SET is_deleted = TRUE,
            deleted_at = NOW()
        WHERE id = :id
    """), {"id": id})
    record_dashboard_event(
        db,
        current_admin,
        action="deleted insurance company",
        table_name="master_insurance_company",
        record_id=existing["id"],
        message=f"Insurance company {existing['company_name']} was deleted",
        preference_key="deleted",
        old_values=dict(existing),
    )
    db.commit()
