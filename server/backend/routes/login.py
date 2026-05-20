from fastapi import APIRouter, Depends
from pydantic import BaseModel
<<<<<<< HEAD

from .signup import users
from ..utils.hash import verify_password
=======
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import SystemUser
from backend.utils import verify_password
>>>>>>> 004db5aff0611d05f154f33fd620d098b25c45d7

router = APIRouter()

# ================= Login Model =================
class LoginData(BaseModel):
    email: str
    password: str

# ================= Login Route =================
<<<<<<< HEAD


@router.post("/login")
def login(data: LoginData):

    for user in users:
        if user["email"] == data.email:
            # Support hashed passwords; fall back to plain equality for legacy entries
            if verify_password(data.password, user["password"]) or data.password == user["password"]:
                return {
                    "message": "Login successful",
                    "user": user["email"],
                    "role": user["role"],
                }

    return {"error": "Invalid email or password"}
=======
@router.post("/login")
def login(data: LoginData, db: Session = Depends(get_db)):
    
    # 1. Find the user in the database by email
    user = db.query(SystemUser).filter(SystemUser.email == data.email).first()
    
    # 2. Check if the user exists AND if the password matches the hashed password
    if not user or not verify_password(data.password, user.password_hash):
        return {"error": "Invalid email or password"}
        
    # 3. Success! (In the future, you will generate a real JWT token here)
    return {
        "message": "Login successful", 
        "user": user.email,
        "role_id": str(user.role_id)
    }
>>>>>>> 004db5aff0611d05f154f33fd620d098b25c45d7
