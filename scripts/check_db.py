import sys, os
sys.path.insert(0, 'server')
import psycopg2
from dotenv import load_dotenv
from pathlib import Path
load_dotenv(dotenv_path=Path('server/.env'))
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

cur.execute("SELECT f.id, f.file_number, c.full_name FROM file_record f JOIN customer c ON c.id=f.customer_id WHERE f.is_deleted=false ORDER BY f.created_at DESC LIMIT 10")
rows = cur.fetchall()
print('=== FILES ===')
for r in rows:
    print(f'  ID={r[0]}  FILE={r[1]}  CUSTOMER={r[2]}')

cur.execute("SELECT id, bank_name, account_number FROM master_company_bank LIMIT 10")
banks = cur.fetchall()
print('=== COMPANY BANKS ===')
for b in banks:
    print(f'  ID={b[0]}  NAME={b[1]}  ACCT={b[2]}')

cur.execute("SELECT id, full_name, mobile_1 FROM customer WHERE full_name ILIKE '%meet%' OR full_name ILIKE '%akshara%' LIMIT 5")
custs = cur.fetchall()
print('=== MATCHING CUSTOMERS ===')
for c in custs:
    print(f'  ID={c[0]}  NAME={c[1]}  MOBILE={c[2]}')

cur.close()
conn.close()
