import bcrypt

def get_password_hash(password: str) -> str:
    # Bcrypt requires bytes, so we encode the password string
    pwd_bytes = password.encode('utf-8')
    # Generate a secure salt
    salt = bcrypt.gensalt()
    # Hash the password
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    # Decode back to a string so it can be saved in the PostgreSQL database
    return hashed_password.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Convert both the plain password and the stored hash into bytes for comparison
    password_bytes = plain_password.encode('utf-8')
    hashed_password_bytes = hashed_password.encode('utf-8')
    
    return bcrypt.checkpw(password_bytes, hashed_password_bytes)