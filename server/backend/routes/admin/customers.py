from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from uuid import UUID
import datetime

from backend.database import get_db
from backend.models import Customer

router = APIRouter(prefix="/api/v1/customers", tags=["Admin Customers"])

class CustomerCreate(BaseModel):
    full_name: str
    mobile_1: str
    email: Optional[str] = None
    city: Optional[str] = None

@router.get("/")
def list_customers(page: int = 1, limit: int = 50, search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Customer)
    if search:
        query = query.filter(Customer.full_name.ilike(f"%{search}%") | Customer.mobile_1.ilike(f"%{search}%"))
    
    total = query.count()
    customers = query.order_by(Customer.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    return {
        "data": customers,
        "total": total,
        "page": page,
        "limit": limit
    }

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)):
    new_customer = Customer(**payload.dict())
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    return new_customer