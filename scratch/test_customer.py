import sys
from pathlib import Path

# Add server directory to path
sys.path.insert(0, str(Path("d:/Lyrcon_Internship/auto-nidhi/server")))

import dotenv
dotenv.load_dotenv("d:/Lyrcon_Internship/auto-nidhi/server/backend/.env")

from backend.database import SessionLocal
from backend.models import SystemUser, Customer, MasterRole
from backend.utils import get_customer_for_user

def check_customers():
    db = SessionLocal()
    try:
        # Find customer role
        cust_role = db.query(MasterRole).filter(MasterRole.role_name.ilike("customer")).first()
        if not cust_role:
            print("Customer role not found in master_role!")
            return
            
        print(f"Customer Role ID: {cust_role.id}")
        
        # Find users with customer role
        cust_users = db.query(SystemUser).filter(SystemUser.role_id == cust_role.id).all()
        print(f"Total system users with Customer role: {len(cust_users)}")
        
        for user in cust_users:
            print(f"\nUser: {user.first_name} {user.last_name} | Email: {user.email} | Phone: {user.phone_number} | Active: {user.is_active}")
            # Try to resolve to a customer profile
            profile = get_customer_for_user(user, db)
            if profile:
                print(f"  -> MATCHED Customer Profile: {profile.full_name} | Mobile: {profile.mobile_1} | Email: {profile.email}")
            else:
                print("  -> NO MATCHING Customer Profile found in the customer table!")
                
    finally:
        db.close()

if __name__ == "__main__":
    check_customers()
