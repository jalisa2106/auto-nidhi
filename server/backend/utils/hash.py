from passlib.context import CryptContext

# Use bcrypt for password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a plaintext password."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a hashed password."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        # If verification fails (malformed hash, etc.) treat as non-match
        return False
