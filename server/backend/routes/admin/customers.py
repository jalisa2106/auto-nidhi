import re
import os

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID
from datetime import date
from backend.email_utils import send_email

from backend.database import get_db
from backend.models import Customer, FileRecord, SystemUser, MasterRole, PaymentIn, PaymentOut, InsurancePayment, RTOPayment, FinanceInfo
from backend.utils import get_current_staff, get_current_admin, record_dashboard_event, get_password_hash

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
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db), current_user: SystemUser = Depends(get_current_staff)):
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
    default_password = f"{first_name.lower()}_123"

    new_user = SystemUser(
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone_number=payload.mobile_1,
        password_hash=get_password_hash(default_password),
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

        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        login_url = f"{frontend_url}/login"

        email_body = f"""Hello {first_name},

        Your Auto Nidhi customer account has been created.

        You can sign in using the login credentials given below:

        Login URL: {login_url}
        Email ID: {email}
        Default Password: {default_password}
        Role: Customer

        Disclaimer:
        For your security, please change your password after your first login.
        Do not share your login credentials with anyone.

        Regards,
        Auto Nidhi Team
        """

        try:
            send_email(
                to_email=email,
                subject="Your Auto Nidhi customer account has been created",
                body=email_body,
            )
        except Exception as exc:
            print(f"Failed to send customer account email: {exc}")

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    db.refresh(new_customer)
    
    res = new_customer.__dict__.copy()
    res["active_files_count"] = 0 
    return res


class CustomerUpdate(BaseModel):
    full_name: Optional[str] = None
    mobile_1: Optional[str] = None
    mobile_2: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    date_of_birth: Optional[date] = None
    aadhar_number: Optional[str] = None
    pan_number: Optional[str] = None
    customer_type: Optional[str] = None

    @validator("full_name")
    def validate_full_name(cls, v):
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Full name cannot be empty")
        return v

    @validator("mobile_2", pre=True)
    def validate_mobile_2(cls, v):
        return None if v == "" else v


@router.put("/{customer_id}")
def update_customer(
    customer_id: UUID,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: SystemUser = Depends(get_current_staff),
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    old_values = {
        "full_name": customer.full_name,
        "mobile_1": customer.mobile_1,
        "email": customer.email,
    }

    update_data = payload.dict(exclude_none=True)
    for field, value in update_data.items():
        setattr(customer, field, value)

    try:
        record_dashboard_event(
            db, current_user,
            action="updated customer",
            table_name="customer",
            record_id=customer.id,
            message=f"Customer {customer.full_name} was updated",
            preference_key="updated",
            old_values=old_values,
            new_values={"full_name": customer.full_name, "mobile_1": customer.mobile_1},
        )
        db.commit()
        db.refresh(customer)
        res = customer.__dict__.copy()
        res["active_files_count"] = db.query(FileRecord).filter(FileRecord.customer_id == customer.id).count()
        return res
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{customer_id}/deactivate", status_code=200)
def deactivate_customer(
    customer_id: UUID,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Also deactivate the linked system user account
    linked_user = db.query(SystemUser).filter(SystemUser.email == customer.email).first()
    if linked_user:
        linked_user.is_active = False

    try:
        record_dashboard_event(
            db, current_admin,
            action="deactivated customer",
            table_name="customer",
            record_id=customer.id,
            message=f"Customer {customer.full_name} was deactivated",
            preference_key="deleted",
            old_values={"full_name": customer.full_name, "mobile_1": customer.mobile_1},
        )
        db.commit()
        return {"status": "success", "message": f"Customer {customer.full_name} deactivated"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{customer_id}/profile")
def get_customer_profile(
    customer_id: UUID,
    db: Session = Depends(get_db),
    _: SystemUser = Depends(get_current_admin),
):
    """Full customer profile with all financial activity — shown to admin when clicking a customer row."""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # ── Files ────────────────────────────────────────────────────────────────
    files_q = db.query(FileRecord).filter(
        FileRecord.customer_id == customer_id,
        FileRecord.is_deleted == False,
    )
    files_total = files_q.count()

    file_status_counts = (
        db.query(FileRecord.status, func.count(FileRecord.id))
        .filter(FileRecord.customer_id == customer_id, FileRecord.is_deleted == False)
        .group_by(FileRecord.status)
        .all()
    )
    files_by_status = {s: c for s, c in file_status_counts}

    file_ids_subq = db.query(FileRecord.id).filter(
        FileRecord.customer_id == customer_id,
        FileRecord.is_deleted == False,
    ).scalar_subquery()

    # ── Payment IN ───────────────────────────────────────────────────────────
    pay_in = db.query(
        func.count(PaymentIn.id),
        func.coalesce(func.sum(PaymentIn.payment_amount), 0),
    ).filter(PaymentIn.file_id.in_(file_ids_subq)).one()
    payment_in_count = pay_in[0] or 0
    payment_in_total = float(pay_in[1] or 0)

    # ── Payment OUT ──────────────────────────────────────────────────────────
    pay_out = db.query(
        func.count(PaymentOut.id),
        func.coalesce(func.sum(PaymentOut.amount), 0),
    ).filter(PaymentOut.file_id.in_(file_ids_subq)).one()
    payment_out_count = pay_out[0] or 0
    payment_out_total = float(pay_out[1] or 0)

    # ── Insurance ────────────────────────────────────────────────────────────
    ins = db.query(
        func.count(InsurancePayment.id),
        func.coalesce(func.sum(InsurancePayment.amount), 0),
    ).filter(
        InsurancePayment.file_id.in_(file_ids_subq),
        InsurancePayment.is_deleted == False,
    ).one()
    insurance_count = ins[0] or 0
    insurance_total = float(ins[1] or 0)

    # ── RTO ──────────────────────────────────────────────────────────────────
    rto = db.query(
        func.count(RTOPayment.id),
        func.coalesce(func.sum(RTOPayment.amount), 0),
    ).filter(
        RTOPayment.file_id.in_(file_ids_subq),
        RTOPayment.is_deleted == False,
    ).one()
    rto_count = rto[0] or 0
    rto_total = float(rto[1] or 0)

    # ── Loans ─────────────────────────────────────────────────────────────────
    loans = db.query(
        func.count(FinanceInfo.id),
        func.coalesce(func.sum(FinanceInfo.loan_amount), 0),
    ).filter(FinanceInfo.file_id.in_(file_ids_subq)).one()
    loans_count = loans[0] or 0
    loans_total = float(loans[1] or 0)

    # ── Recent 5 Files ────────────────────────────────────────────────────────
    recent_files = (
        db.query(FileRecord)
        .filter(FileRecord.customer_id == customer_id, FileRecord.is_deleted == False)
        .order_by(FileRecord.created_at.desc())
        .limit(5)
        .all()
    )
    recent_files_data = [
        {
            "id": str(f.id),
            "file_number": f.file_number or "—",
            "file_type": f.file_type or "—",
            "status": f.status or "—",
            "created_at": f.created_at.strftime("%Y-%m-%d") if f.created_at else "—",
        }
        for f in recent_files
    ]

    # ── Creator info ──────────────────────────────────────────────────────────
    creator_name = None
    if customer.created_by:
        creator = db.query(SystemUser).filter(SystemUser.id == customer.created_by).first()
        if creator:
            creator_name = f"{creator.first_name or ''} {creator.last_name or ''}".strip()

    def safe_date(d):
        if d is None:
            return None
        if hasattr(d, "isoformat"):
            return d.isoformat()
        return str(d)

    return {
        # Profile
        "id": str(customer.id),
        "full_name": customer.full_name or "—",
        "email": customer.email or "—",
        "mobile_1": customer.mobile_1 or "—",
        "mobile_2": customer.mobile_2 or None,
        "address": customer.address or "—",
        "city": customer.city or "—",
        "state": customer.state or "—",
        "pincode": customer.pincode or "—",
        "date_of_birth": safe_date(customer.date_of_birth),
        "aadhar_number": customer.aadhar_number or "—",
        "pan_number": customer.pan_number or "—",
        "customer_type": customer.customer_type or "individual",
        "created_at": safe_date(customer.created_at),
        "added_by": creator_name,
        # Activity
        "files_total": files_total,
        "files_by_status": files_by_status,
        "payment_in_count": payment_in_count,
        "payment_in_total": payment_in_total,
        "payment_out_count": payment_out_count,
        "payment_out_total": payment_out_total,
        "insurance_count": insurance_count,
        "insurance_total": insurance_total,
        "rto_count": rto_count,
        "rto_total": rto_total,
        "loans_count": loans_count,
        "loans_total": loans_total,
        # Recent files
        "recent_files": recent_files_data,
    }
