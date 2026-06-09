import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta
import jwt

# Add server directory to path
sys.path.insert(0, str(Path("d:/Lyrcon_Internship/auto-nidhi/server")))

import dotenv
dotenv.load_dotenv("d:/Lyrcon_Internship/auto-nidhi/server/backend/.env")

from fastapi.testclient import TestClient
from backend.main import app
from backend.database import SessionLocal
from backend.models import SystemUser
from backend.utils import SECRET_KEY, ALGORITHM

client = TestClient(app)

def generate_token(user_id, email):
    to_encode = {
        "sub": str(user_id),
        "email": email,
        "role": "customer",
        "iat": int(datetime.now(timezone.utc).timestamp()),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60)
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def test_post():
    db = SessionLocal()
    try:
        user = db.query(SystemUser).filter(SystemUser.email == "hima@gmail.com").first()
        if not user:
            print("User hima@gmail.com not found!")
            return
            
        token = generate_token(user.id, user.email)
        headers = {"Authorization": f"Bearer {token}"}
        
        payload = {
            "request_type": "loan",
            "details": {
                "vehicle_make": "Maruti",
                "vehicle_model": "Swift",
                "loan_amount": 500000,
                "tenure": 36
            },
            "remarks": "Testing from Python script"
        }
        
        res = client.post("/api/v1/service-requests/", json=payload, headers=headers)
        print(f"Status Code: {res.status_code}")
        print("Response Body:", res.text)
        
    finally:
        db.close()

if __name__ == "__main__":
    test_post()
