import secrets
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import SystemUser
from backend.utils import get_password_hash

router = APIRouter()

# ── In-memory token store: { token: { "email": str, "expires_at": datetime } }
# NOTE: This resets on every server restart. For production, store tokens in DB.
reset_tokens: dict = {}

TOKEN_EXPIRY_MINUTES = 60  # 1 hour


# ── Pydantic Models ──────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Step 1: Accept user's email, generate a reset token.
    Always returns 200 regardless of whether email exists (security best practice).
    For testing: token is included in the response so you can use it without email setup.
    """
    user = db.query(SystemUser).filter(SystemUser.email == data.email).first()

    if user:
        # Generate a cryptographically secure token
        token = secrets.token_urlsafe(32)
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=TOKEN_EXPIRY_MINUTES)

        # Store the token mapped to this user's email
        reset_tokens[token] = {
            "email": user.email,
            "expires_at": expires_at,
        }

        # In production: send email with reset link here
        # For now: return the token directly for testing
        return {
            "message": "If an account exists with this email, you will receive reset instructions.",
            "debug_token": token,  # REMOVE this line in production
            "debug_email": user.email,  # REMOVE this line in production
        }

    # User not found — still return 200 (don't reveal existence)
    return {
        "message": "If an account exists with this email, you will receive reset instructions.",
    }


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Step 2: Validate token, update user's password.
    """
    # 1. Validate passwords match
    if data.new_password != data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )

    # 2. Validate password length
    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )

    # 3. Check if token exists
    token_data = reset_tokens.get(data.token)
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token. Please request a new password reset."
        )

    # 4. Check if token has expired
    if datetime.datetime.utcnow() > token_data["expires_at"]:
        del reset_tokens[data.token]  # Clean up expired token
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired. Please request a new password reset."
        )

    # 5. Find the user
    user = db.query(SystemUser).filter(SystemUser.email == token_data["email"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )

    # 6. Update the password
    user.password_hash = get_password_hash(data.new_password)
    db.commit()

    # 7. Remove the used token (one-time use)
    del reset_tokens[data.token]

    return {"message": "Password updated successfully. You can now sign in with your new password."}
