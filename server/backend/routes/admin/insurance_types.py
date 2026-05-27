from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.database import get_db

router = APIRouter(prefix="/api/v1/masters", tags=["Insurance Types"])

# ── Pydantic schemas ──────────────────────────────────────────────────────────
class InsuranceTypeIn(BaseModel):
    insurance_type_name: str

class InsuranceTypeUpdate(BaseModel):
    insurance_type_name: Optional[str] = None

# ── Routes ────────────────────────────────────────────────────────────────────
@router.get("/insurance-types")
def list_insurance_types(db: Session = Depends(get_db)):
    """
    List all insurance types.
    Returns a list of all insurance type records sorted by name.
    """
    rows = db.execute(text("""
        SELECT id, insurance_type_name
        FROM master_insurance_type
        WHERE is_deleted = FALSE
        ORDER BY insurance_type_name
    """)).mappings().all()
    return [dict(r) for r in rows]

@router.post("/insurance-types", status_code=201)
def create_insurance_type(data: InsuranceTypeIn, db: Session = Depends(get_db)):
    """
    Create a new insurance type.
    Requires: insurance_type_name (must be unique)
    """
    try:
        result = db.execute(text("""
            INSERT INTO master_insurance_type (insurance_type_name)
            VALUES (:insurance_type_name)
            RETURNING id, insurance_type_name
        """), data.model_dump())
        db.commit()
        return dict(result.mappings().one())
    except Exception as e:
        db.rollback()
        if "unique" in str(e).lower():
            raise HTTPException(status_code=400, detail="Insurance type name already exists")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/insurance-types/{id}")
def get_insurance_type(id: str, db: Session = Depends(get_db)):
    """
    Get a single insurance type by ID.
    """
    result = db.execute(text("""
        SELECT id, insurance_type_name
        FROM master_insurance_type
        WHERE id = :id AND is_deleted = FALSE
    """), {"id": id}).mappings().first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Insurance type not found")
    return dict(result)

@router.put("/insurance-types/{id}")
def update_insurance_type(id: str, data: InsuranceTypeUpdate, db: Session = Depends(get_db)):
    """
    Update an insurance type by ID.
    Only provided fields will be updated.
    """
    # Check if insurance type exists
    existing = db.execute(text("SELECT id FROM master_insurance_type WHERE id = :id"), {"id": id}).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Insurance type not found")
    
    # Build update query only if there are fields to update
    fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    set_clause = ", ".join([f"{k} = :{k}" for k in fields])
    fields["id"] = id
    
    try:
        result = db.execute(text(f"""
            UPDATE master_insurance_type SET {set_clause}
            WHERE id = :id
            RETURNING id, insurance_type_name
        """), fields)
        db.commit()
        return dict(result.mappings().one())
    except Exception as e:
        db.rollback()
        if "unique" in str(e).lower():
            raise HTTPException(status_code=400, detail="Insurance type name already exists")
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/insurance-types/{id}", status_code=204)
def delete_insurance_type(id: str, db: Session = Depends(get_db)):
    """
    Soft delete an insurance type by ID.
    """
    existing = db.execute(text("SELECT id FROM master_insurance_type WHERE id = :id AND is_deleted = FALSE"), {"id": id}).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Insurance type not found")
    
    try:
        db.execute(text("""
            UPDATE master_insurance_type
            SET is_deleted = TRUE,
                deleted_at = NOW()
            WHERE id = :id
        """), {"id": id})
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Cannot delete: insurance type may be in use")
