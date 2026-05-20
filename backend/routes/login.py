from fastapi import APIRouter
from pydantic import BaseModel

from backend.routes.signup import users

router = APIRouter()

# ================= Login Model =================

class LoginData(BaseModel):
    email: str
    password: str

# ================= Login Route =================

@router.post("/login")
def login(data: LoginData):

    for user in users:

        if (
            user["email"] == data.email
            and user["password"] == data.password
        ):

            return {
                "message": "Login successful",
                "user": user["email"]
            }

    return {
        "error": "Invalid email or password"
    }