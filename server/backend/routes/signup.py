from fastapi import APIRouter, Depends
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
    email: str
    password: str
    confirmPassword: str
    phone_number: str | None = None
    role: str
    passkey: str | None = None

# ================= Signup Route =================
@router.post("/signup")
def signup(data: SignupData, db: Session = Depends(get_db)):

    # 1. Password match check
    if data.password != data.confirmPassword:
        return {"error": "Passwords do not match"}

    # 2. Existing user check in the Database
    existing_user = db.query(SystemUser).filter(SystemUser.email == data.email).first()
    if existing_user:
        return {"error": "User already exists"}

    # 3. Passkey validation for restricted roles
    if data.role in VALID_PASSKEYS:
        if data.passkey != VALID_PASSKEYS[data.role]:
            return {"error": "Invalid passkey for this role"}

    # 4. Find the matching Role ID from the master_role table
    db_role = db.query(MasterRole).filter(MasterRole.role_name.ilike(data.role)).first()
    if not db_role:
        return {"error": f"Role '{data.role}' does not exist in the database"}

    # 5. Hash password and save to Database
    hashed_pwd = get_password_hash(data.password)
    
    new_user = SystemUser(
        first_name=data.first_name,
        last_name=data.last_name,
        phone_number=data.phone_number,
        email=data.email,
        password_hash=hashed_pwd,
        role_id=db_role.id
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "Signup successful", "user": new_user.email}