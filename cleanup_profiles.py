import sys, os
sys.path.insert(0, 'server')
import psycopg2
from dotenv import load_dotenv
from pathlib import Path
load_dotenv(dotenv_path=Path('server/.env'))
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

cur.execute("DELETE FROM master_company_profile WHERE id != '4a598084-b62d-482a-91d6-2ea2976a53a3'")
conn.commit()

cur.execute("SELECT count(*) FROM master_company_profile")
print("Remaining profiles:", cur.fetchone()[0])

cur.close()
conn.close()
