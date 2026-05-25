from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID
import re

from backend.database import get_db
from backend.models import Customer, FileRecord

router = APIRouter(prefix="/api/v1/customers", tags=["Admin Customers"])

class CustomerCreate(BaseModel):
    full_name: str = Field(..., min_length=1)
    mobile_1: str = Field(..., pattern=r"^[0-9]{10}$")
    email: Optional[str] = None
    city: Optional[str] = None

    @validator("full_name")
    def validate_full_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Full name is required")
        if not re.match(r"^[A-Za-z ]+$", value):
            raise ValueError("Full name must contain letters and spaces only")
        return value

    @validator("city")
    def validate_city(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("City cannot be empty")
        if not re.match(r"^[A-Za-z ]+$", value):
            raise ValueError("City must contain letters and spaces only")
        return value

@router.get("/")
def list_customers(page: int = 1, limit: int = 50, search: Optional[str] = None, db: Session = Depends(get_db)):
    # Query with left outer join to count active files per customer
    query = db.query(
        Customer, 
        func.count(FileRecord.id).label("active_files_count")
    ).outerjoin(FileRecord).group_by(Customer.id)

    if search:
        search_term = f"%{search}%"
        query = query.filter(Customer.full_name.ilike(search_term) | Customer.mobile_1.ilike(search_term))
    
    total = query.count()
    results = query.order_by(Customer.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    # Format the response to include the active_files_count for the frontend
    customers_data = []
    for customer, count in results:
        cust_dict = customer.__dict__.copy()
        cust_dict["active_files_count"] = count 
        customers_data.append(cust_dict)
    
    return customers_data

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)):
    # Validate mobile uniqueness
    existing = db.query(Customer).filter(Customer.mobile_1 == payload.mobile_1).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Customer with this mobile already exists")

    new_customer = Customer(**payload.dict())
    db.add(new_customer)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    db.refresh(new_customer)
    return new_customer