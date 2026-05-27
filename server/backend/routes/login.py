from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import SystemUser, MasterRole
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

    # 3. Block deactivated accounts — they cannot log in at all
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact the administrator."
        )

    # 4. Get the Role Name from the database using role_id
    db_role = db.query(MasterRole).filter(MasterRole.id == user.role_id).first()
    role_name = db_role.role_name.lower() if db_role else "customer"

    # 5. Update last_login timestamp on every successful login
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    # 6. Generate JWT tokens
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": role_name,
    }

    access_token = create_access_token(data=token_data)
    refresh_token = create_access_token(data=token_data)

    # 7. Return full user payload so the frontend profile page has all fields
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "message": "Login successful",
        "user": {
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone_number": user.phone_number,
            "role": role_name,
            "role_id": str(user.role_id) if user.role_id else None,
            "is_active": user.is_active,
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }
    }
