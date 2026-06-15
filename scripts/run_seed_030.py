"""
AutoNidhi — Seed Runner: 030_seed_real_data.sql
Runs the seed file against the Neon PostgreSQL database.
Safe to re-run: all inserts use ON CONFLICT DO NOTHING / WHERE NOT EXISTS guards.
"""

import os
import sys
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

# Try loading from server/.env first
load_dotenv(dotenv_path=Path('server/.env'))
load_dotenv(dotenv_path=Path('server/backend/.env'))

# Load DATABASE_URL from environment — never hardcode credentials!
DSN = os.getenv("DATABASE_URL")

if not DSN:
    print("[FATAL] DATABASE_URL environment variable not set.")
    print("  Set it in server/.env or export it before running this script.")
    sys.exit(1)

SEED_FILE = Path(__file__).parent.parent / "database" / "database" / "030_seed_real_data.sql"


def run_seed():
    print("Connecting to Neon DB...")
    try:
        conn = psycopg2.connect(DSN)
        conn.autocommit = False
        cur = conn.cursor()
        print("Connected.\n")
    except Exception as e:
        print(f"[FATAL] Could not connect to database: {e}")
        sys.exit(1)

    print(f">> Running: {SEED_FILE.name}")

    if not SEED_FILE.exists():
        print(f"[FAIL] Seed file not found: {SEED_FILE}")
        sys.exit(1)

    sql = SEED_FILE.read_text(encoding="utf-8")

    try:
        cur.execute(sql)
        conn.commit()
        print("[OK] Seed data inserted successfully!\n")
    except Exception as e:
        conn.rollback()
        print(f"[FAIL] Error running seed: {e}")
        cur.close()
        conn.close()
        sys.exit(1)

    # Verify the inserts
    print("=== Verification ===")
    checks = [
        ("Customers seeded",   "SELECT COUNT(*) FROM customer WHERE mobile_1 LIKE '97123000%'"),
        ("File records seeded","SELECT COUNT(*) FROM file_record WHERE file_number LIKE 'AN-2024-%'"),
        ("Finance info seeded","SELECT COUNT(*) FROM finance_info fi JOIN file_record fr ON fr.id = fi.file_id WHERE fr.file_number LIKE 'AN-2024-%'"),
        ("Payment In seeded",  "SELECT COUNT(*) FROM payment_in pi JOIN file_record fr ON fr.id = pi.file_id WHERE fr.file_number LIKE 'AN-2024-%'"),
        ("Payment Out seeded", "SELECT COUNT(*) FROM payment_out po JOIN file_record fr ON fr.id = po.file_id WHERE fr.file_number LIKE 'AN-2024-%'"),
        ("Advances seeded",    "SELECT COUNT(*) FROM advances WHERE purpose ILIKE '%advance%'"),
        ("Dealers added",      "SELECT COUNT(*) FROM master_dealer WHERE phone LIKE '98250111%'"),
        ("Brokers added",      "SELECT COUNT(*) FROM master_broker WHERE phone LIKE '98980112%'"),
    ]

    for label, query in checks:
        cur.execute(query)
        count = cur.fetchone()[0]
        print(f"  {label}: {count}")

    cur.close()
    conn.close()
    print("\nDone!")


if __name__ == "__main__":
    run_seed()
