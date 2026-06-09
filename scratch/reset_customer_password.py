import sys
from pathlib import Path

# Add server directory to path
sys.path.insert(0, str(Path("d:/Lyrcon_Internship/auto-nidhi/server")))

import dotenv
dotenv.load_dotenv("d:/Lyrcon_Internship/auto-nidhi/server/backend/.env")

from backend.database import SessionLocal
from backend.models import SystemUser
from backend.utils import get_password_hash

def reset_password():
    db = SessionLocal()
    try:
        user = db.query(SystemUser).filter(SystemUser.email == "hima@gmail.com").first()
        if not user:
            print("User hima@gmail.com not found!")
            return
            
        new_password = "hima_123"
        user.password_hash = get_password_hash(new_password)
        db.commit()
        print(f"Successfully updated password for {user.email} to '{new_password}' in the database.")
    finally:
        db.close()

if __name__ == "__main__":
    reset_password()
