from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import SystemUser, MasterRole, Customer
from backend.utils import get_password_hash, create_access_token

router = APIRouter()

# Simple hardcoded passkeys to match your frontend logic
VALID_PASSKEYS = {
    "admin": "admin123",
    "accountant": "acc123",
    "data_entry": "data123"
}

# ================= Signup Model =================
class SignupData(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    email: str
    password: str
    confirmPassword: str
    role: str
    passkey: Optional[str] = None

# ================= Signup Route =================
@router.post("/signup")
def signup(data: SignupData, db: Session = Depends(get_db)):

    # 1. Password match check
    if data.password != data.confirmPassword:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Passwords do not match")

    email = data.email.strip().lower()
    
    # 2. Existing user check in the Database
    existing_user = db.query(SystemUser).filter(SystemUser.email == email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")

    # 3. Normalize the requested role and validate passkey for restricted roles
    role_key = data.role.strip().lower()

    if role_key in VALID_PASSKEYS:
        if data.passkey != VALID_PASSKEYS[role_key]:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid passkey for this role")

    if role_key == "customer" and not data.phone_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number is required for customer signup",
        )

    if role_key == "customer":
        existing_customer_mobile = db.query(Customer).filter(Customer.mobile_1 == data.phone_number).first()
        if existing_customer_mobile:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Customer with this mobile already exists",
            )

    # 4. Find the matching Role ID from the master_role table
    db_role = db.query(MasterRole).filter(MasterRole.role_name.ilike(role_key)).first()
    if not db_role:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Role '{data.role}' does not exist in the database")

    # 5. Hash password and save to Database
    hashed_pwd = get_password_hash(data.password)
    
    new_user = SystemUser(
        first_name=data.first_name,
        last_name=data.last_name,
        email=email,
        password_hash=hashed_pwd,
        phone_number=data.phone_number,
        role_id=db_role.id
    )
    
    db.add(new_user)

    if role_key == "customer":
        existing_customer = db.query(Customer).filter(Customer.email == email).first()

        if not existing_customer:
            full_name = f"{data.first_name} {data.last_name or ''}".strip()

            new_customer = Customer(
                full_name=full_name,
                email=email,
                mobile_1=data.phone_number,
                customer_type="individual",
            )
            db.add(new_customer)

    try:
        db.commit()
        db.refresh(new_user)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    role_name = db_role.role_name.lower()
    # 1. Generate the tokens so the user is instantly logged in
    token_data = {
        "sub": str(new_user.id),
        "email": new_user.email,
        "role": role_name,
    }
    access_token = create_access_token(data=token_data)
    refresh_token = create_access_token(data=token_data)

    # 2. Return the exact same nested structure as login.py
    return {
        "message": "Signup successful", 
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "email": new_user.email,
            "first_name": new_user.first_name,
            "last_name": new_user.last_name,
            "role": role_name,
            "role_id": str(new_user.role_id)
        }
    }