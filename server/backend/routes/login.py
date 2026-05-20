from fastapi import APIRouter
from pydantic import BaseModel

from .signup import users
from ..utils.hash import verify_password

router = APIRouter()


# ================= Login Model =================

class LoginData(BaseModel):
    email: str
    password: str


# ================= Login Route =================


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
