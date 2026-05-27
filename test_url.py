from sqlalchemy import create_engine
try:
    create_engine('"postgresql://user:pass@host/db"')
    print("SUCCESS")
except Exception as e:
    print(f"FAILED: {e}")
