from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

# ================= Dummy Database =================

users = []

# ================= Signup Model =================

class SignupData(BaseModel):
    email: str
    password: str
    confirmPassword: str
    role: str
    passkey: str | None = None

# ================= Signup Route =================

@router.post("/signup")
def signup(data: SignupData):

    # Password match check
    if data.password != data.confirmPassword:
        return {
            "error": "Passwords do not match"
        }

    # Existing user check
    for user in users:

        if user["email"] == data.email:
            return {
                "error": "User already exists"
            }

    # Save user
    users.append({
        "email": data.email,
        "password": data.password,
        "role": data.role,
    })

    return {
        "message": "Signup successful",
        "user": data.email
    }