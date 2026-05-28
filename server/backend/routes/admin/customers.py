from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID
from datetime import date
import re

from backend.database import get_db
from backend.models import Customer, FileRecord, SystemUser, MasterRole
from backend.utils import get_current_admin, record_dashboard_event, get_password_hash


router = APIRouter(prefix="/api/v1/customers", tags=["Admin Customers"])

class CustomerCreate(BaseModel):
    full_name: str = Field(..., min_length=1)
    mobile_1: str = Field(..., pattern=r"^[0-9]{10}$")
    email: str
    address: str
    city: str
    state: str
    pincode: str
    date_of_birth: date
    aadhar_number: str
    
    # These two remain optional
    mobile_2: Optional[str] = None
    pan_number: Optional[str] = None
    customer_type: str = 'individual'

    @validator("full_name")
    def validate_full_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Full name is required")
        if not re.match(r"^[A-Za-z ]+$", value):
            raise ValueError("Full name must contain letters and spaces only")
        return value

    @validator("mobile_2", pre=True)
    def validate_empty_string(cls, v):
        return None if v == "" else v

def get_customer_role(db: Session) -> MasterRole:
    role = db.query(MasterRole).filter(MasterRole.role_name.ilike("customer")).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer role not found in master_role table",
        )
    return role

@router.get("/")
def list_customers(page: int = 1, limit: int = 50, search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(
        Customer, 
        func.count(FileRecord.id).label("active_files_count")
    ).outerjoin(FileRecord).group_by(Customer.id)

    if search:
        search_term = f"%{search}%"
        query = query.filter(Customer.full_name.ilike(search_term) | Customer.mobile_1.ilike(search_term))
    
    total = query.count()
    results = query.order_by(Customer.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    customers_data = []
    for customer, count in results:
        cust_dict = customer.__dict__.copy()
        cust_dict["active_files_count"] = count 
        customers_data.append(cust_dict)
    
    return customers_data

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db), current_user: SystemUser = Depends(get_current_admin)):
    existing = db.query(Customer).filter(Customer.mobile_1 == payload.mobile_1).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Customer with this mobile already exists",
        )

    email = payload.email.strip().lower()

    existing_user = db.query(SystemUser).filter(SystemUser.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A login user with this customer email already exists",
        )

    customer_role = get_customer_role(db)

    name_parts = payload.full_name.strip().split(" ", 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else None

    new_user = SystemUser(
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone_number=payload.mobile_1,
        password_hash=get_password_hash(payload.mobile_1),
        role_id=customer_role.id,
        is_active=True,
    )

    new_customer = Customer(**payload.dict(exclude_unset=True))
    new_customer.email = email
    new_customer.created_by = current_user.id
    
    db.add(new_user)
    db.add(new_customer)

    try:
        db.flush()
        record_dashboard_event(
            db,
            current_user,
            action="created customer",
            table_name="customer",
            record_id=new_customer.id,
            message=f"Customer {new_customer.full_name} was added",
            preference_key="added",
            new_values={
                "id": str(new_customer.id),
                "full_name": new_customer.full_name,
                "mobile_1": new_customer.mobile_1,
                "email": new_customer.email,
                "city": new_customer.city,
                "customer_type": new_customer.customer_type,
            },
        )
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    db.refresh(new_customer)
    
    res = new_customer.__dict__.copy()
    res["active_files_count"] = 0 
    return res
