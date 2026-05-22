import sys
import os
import uuid

# Add server directory to path so we can import backend modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.database import SessionLocal
from backend.models import SystemUser, MasterRole
from backend.utils.hash import get_password_hash

def create_users():
    db = SessionLocal()
    
    # Find roles
    admin_role = db.query(MasterRole).filter(MasterRole.role_name == 'admin').first()
    customer_role = db.query(MasterRole).filter(MasterRole.role_name == 'Customer').first()
    
    if not admin_role or not customer_role:
        print("Roles not found. Did you run the database migrations/seed scripts?")
        db.close()
        return
        
    # Create or update Admin
    admin_email = "admin@gmail.com"
    admin_user = db.query(SystemUser).filter(SystemUser.email == admin_email).first()
    admin_hash = get_password_hash("admin123")
    
    if admin_user:
        admin_user.password_hash = admin_hash
        admin_user.role_id = admin_role.id
        print("Admin user updated.")
    else:
        admin_user = SystemUser(
            id=uuid.uuid4(),
            first_name="Admin",
            last_name="User",
            email=admin_email,
            password_hash=admin_hash,
            role_id=admin_role.id,
            is_active=True
        )
        db.add(admin_user)
        print("Admin user created.")
        
    # Create or update Customer
    cust_email = "customer@gmail.com"
    cust_user = db.query(SystemUser).filter(SystemUser.email == cust_email).first()
    cust_hash = get_password_hash("customer123")
    
    if cust_user:
        cust_user.password_hash = cust_hash
        cust_user.role_id = customer_role.id
        print("Customer user updated.")
    else:
        cust_user = SystemUser(
            id=uuid.uuid4(),
            first_name="Test",
            last_name="Customer",
            email=cust_email,
            password_hash=cust_hash,
            role_id=customer_role.id,
            is_active=True
        )
        db.add(cust_user)
        print("Customer user created.")
        
    db.commit()
    db.close()
    print("Successfully set up test users in the database.")

if __name__ == "__main__":
    create_users()
