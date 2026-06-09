import sys
from pathlib import Path
import bcrypt

# Add server directory to path
sys.path.insert(0, str(Path("d:/Lyrcon_Internship/auto-nidhi/server")))

import dotenv
dotenv.load_dotenv("d:/Lyrcon_Internship/auto-nidhi/server/backend/.env")

from backend.database import SessionLocal
from backend.models import SystemUser, MasterRole

def check_passwords():
    db = SessionLocal()
    try:
        cust_role = db.query(MasterRole).filter(MasterRole.role_name.ilike("customer")).first()
        if not cust_role:
            print("Customer role not found!")
            return
            
        users = db.query(SystemUser).filter(SystemUser.role_id == cust_role.id).all()
        print(f"Checking passwords for {len(users)} customer users:")
        
        common_passwords = [
            "hima_123", "jiya_123", "keshvi_123", "riya_123", "akshara_123", "dhruv_123",
            "12345678", "password", "customer", "customer123", "password123", "pass123",
            "Hima_123", "Jiya_123", "Keshvi_123", "Riya_123"
        ]
        
        for u in users:
            print(f"\nUser: {u.first_name} {u.last_name} ({u.email})")
            # Try to verify common passwords
            matched = False
            for p in common_passwords:
                try:
                    hashed = u.password_hash.encode("utf-8")
                    if bcrypt.checkpw(p.encode("utf-8"), hashed):
                        print(f"  -> Password is: '{p}'")
                        matched = True
                        break
                except Exception as e:
                    pass
            if not matched:
                print("  -> Could not verify any common default password.")
    finally:
        db.close()

if __name__ == "__main__":
    check_passwords()
