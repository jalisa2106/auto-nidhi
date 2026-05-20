from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()
ROLE_PASSKEYS = {
    "admin": "AUTONIDHI-ADMIN-001",
    "accountant": "AUTONIDHI-ACC-001",
    "data_entry": "AUTONIDHI-DE-001",
}

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
    if data.role in ROLE_PASSKEYS:
        if(data.passkey != ROLE_PASSKEYS[data.role]):
            return {
                "error": "Inavalid Passkey for this role"
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