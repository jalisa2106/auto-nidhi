from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import SystemUser, MasterRole
from backend.utils import verify_password

router = APIRouter()

# ================= Login Model =================
class LoginData(BaseModel):
    email: str
    password: str

# ================= Login Route =================
@router.post("/login")
def login(data: LoginData, db: Session = Depends(get_db)):
    
    # 1. Find the user in the database by email
    user = db.query(SystemUser).filter(SystemUser.email == data.email).first()
    
    # 2. Check if the user exists AND if the password matches the hashed password
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
        
    # 3. Get the Role Name from the database using role_id
    db_role = db.query(MasterRole).filter(MasterRole.id == user.role_id).first()
    role_name = db_role.role_name.lower() if db_role else "customer"

    # 4. Success! (In the future, you will generate a real JWT token here)
    return {
        "message": "Login successful", 
        "user": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": role_name,
        "role_id": str(user.role_id)
    }