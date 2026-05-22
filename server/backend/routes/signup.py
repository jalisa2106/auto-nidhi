from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import SystemUser, MasterRole
from backend.utils import get_password_hash

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
    last_name: str | None = None
    phone_number: str | None = None
    email: str
    password: str
    confirmPassword: str
    role: str
    passkey: str | None = None

# ================= Signup Route =================
@router.post("/signup")
def signup(data: SignupData, db: Session = Depends(get_db)):

    # 1. Password match check
    if data.password != data.confirmPassword:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Passwords do not match")

    # 2. Existing user check in the Database
    existing_user = db.query(SystemUser).filter(SystemUser.email == data.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")

    # 3. Normalize the requested role and validate passkey for restricted roles
    role_key = data.role.strip().lower()

    if role_key in VALID_PASSKEYS:
        if data.passkey != VALID_PASSKEYS[role_key]:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid passkey for this role")

    # 4. Find the matching Role ID from the master_role table
    db_role = db.query(MasterRole).filter(MasterRole.role_name.ilike(role_key)).first()
    if not db_role:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Role '{data.role}' does not exist in the database")

    # 5. Hash password and save to Database
    hashed_pwd = get_password_hash(data.password)
    
    new_user = SystemUser(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        password_hash=hashed_pwd,
        phone_number=data.phone_number,
        role_id=db_role.id
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    role_name = db_role.role_name.lower()
    return {
        "message": "Signup successful", 
        "user": new_user.email,
        "first_name": new_user.first_name,
        "last_name": new_user.last_name,
        "role": role_name,
        "role_id": str(new_user.role_id)
    }
