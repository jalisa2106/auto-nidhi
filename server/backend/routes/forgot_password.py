import secrets
import datetime
import os
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import SystemUser, PasswordResetToken
from backend.utils import get_password_hash
from backend.email_utils import send_email

router = APIRouter()

TOKEN_EXPIRY_MINUTES = 30  # 30 minutes — safe for Render free-tier cold starts
IS_DEV = os.getenv("APP_ENV", "production").lower() in {"dev", "development", "local"}


# ── Pydantic Models ──────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str


# ── Helper ───────────────────────────────────────────────────────────────────

def _cleanup_expired_tokens(db: Session):
    """Delete all expired tokens from the DB (housekeeping)."""
    now = datetime.datetime.utcnow()
    db.query(PasswordResetToken).filter(PasswordResetToken.expires_at < now).delete()
    db.commit()


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Step 1: Accept user's email, generate a DB-backed reset token, send email.
    Always returns 200 regardless of whether the email exists (security best practice).
    """
    # Clean up stale tokens first
    _cleanup_expired_tokens(db)

    user = db.query(SystemUser).filter(SystemUser.email == data.email).first()

    if user:
        # Remove any existing token for this user (one active token at a time)
        db.query(PasswordResetToken).filter(PasswordResetToken.email == user.email).delete()
        db.commit()

        # Generate a cryptographically secure token and store it in DB
        token = secrets.token_urlsafe(48)
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=TOKEN_EXPIRY_MINUTES)

        reset_token = PasswordResetToken(
            token=token,
            email=user.email,
            expires_at=expires_at,
        )
        db.add(reset_token)
        db.commit()

        # Build reset link using FRONTEND_URL env var (set on Render dashboard)
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
        reset_link = f"{frontend_url}/reset-password?token={token}"

        email_body = f"""Hello {user.first_name or 'there'},

We received a request to reset your Auto Nidhi password.

Click the link below to reset your password:
{reset_link}

This link will expire in {TOKEN_EXPIRY_MINUTES} minutes.

If you did not request this password reset, you can safely ignore this email.

Regards,
Auto Nidhi Team
"""

        try:
            send_email(
                to_email=user.email,
                subject="Reset your Auto Nidhi password",
                body=email_body,
            )
        except Exception as exc:
            # Log the error but don't expose internal details to the client
            print(f"[ERROR] Failed to send password reset email to {user.email}: {exc}")
            # In dev mode, surface the error so it's easy to debug
            if IS_DEV:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Email sending failed: {exc}",
                )

    response = {
        "message": "If an account exists with this email, you will receive reset instructions shortly.",
    }

    # In dev mode, include the token in the response for easy testing without SMTP
    if IS_DEV and user:
        response["debug_token"] = token  # type: ignore[possibly-undefined]
        response["debug_link"] = reset_link  # type: ignore[possibly-undefined]

    return response


@router.get("/reset-password/verify")
def verify_reset_token(token: str, db: Session = Depends(get_db)):
    """Check if a reset token is still valid before showing the reset form."""
    now = datetime.datetime.utcnow()
    token_data = db.query(PasswordResetToken).filter(PasswordResetToken.token == token).first()

    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset link is invalid or has already been used.",
        )

    if now > token_data.expires_at:
        db.delete(token_data)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset link has expired. Please request a new one.",
        )

    return {"message": "Reset link is valid"}


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Step 2: Validate token from DB, update password, delete used token."""
    # 1. Validate passwords match
    if data.new_password != data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match.",
        )

    # 2. Validate password length
    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long.",
        )

    # 3. Look up the token in DB
    now = datetime.datetime.utcnow()
    token_data = db.query(PasswordResetToken).filter(PasswordResetToken.token == data.token).first()

    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token. Please request a new password reset.",
        )

    # 4. Check expiry
    if now > token_data.expires_at:
        db.delete(token_data)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired. Please request a new password reset.",
        )

    # 5. Find the user
    user = db.query(SystemUser).filter(SystemUser.email == token_data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found.",
        )

    # 6. Update the password
    user.password_hash = get_password_hash(data.new_password)
    user.must_change_password = False

    # 7. Delete the used token (one-time use only)
    db.delete(token_data)
    db.commit()

    return {"message": "Password updated successfully. You can now sign in with your new password."}
