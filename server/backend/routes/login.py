from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import SystemUser, MasterRole
# Added create_access_token import
from backend.utils import verify_password, create_access_token 

router = APIRouter()

# ================= Login Model =================
class LoginData(BaseModel):
    email: str
    password: str

# ================= Login Route =================
# Since we put prefix="/api/v1/auth" in main.py, this route becomes /api/v1/auth/login
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

    # 4. Generate JWT Tokens
    # We pack the user's email, role, and ID securely inside the token
    token_data = {
        "sub": user.email, 
        "role": role_name, 
        "user_id": str(user.id)
    }
    
    # Generate both tokens (for now, we'll use the same generation logic for both)
    access_token = create_access_token(data=token_data)
    refresh_token = create_access_token(data=token_data)

    # 5. Return EXACTLY what services.ts TokenResponse expects, plus the user data
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "message": "Login successful", 
        "user": {
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": role_name,
            "role_id": str(user.role_id)
        }
    }