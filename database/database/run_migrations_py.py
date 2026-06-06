"""
AutoNidhi — Migration Runner (022-028)
Runs each SQL file in sequence against the Neon PostgreSQL database.
All migrations use IF NOT EXISTS / DROP IF EXISTS guards — safe to re-run.
"""

import os
import sys
import psycopg2

DSN = (
    "postgresql://neondb_owner:npg_NeCdrFtvj0x6"
    "@ep-plain-flower-aoqt25ev-pooler.c-2.ap-southeast-1.aws.neon.tech"
    "/neondb?sslmode=require"
)

MIGRATIONS_DIR = os.path.dirname(os.path.abspath(__file__))

MIGRATIONS = [
    "022_customer_staff_allocation.sql",
    "023_bank_account_fields.sql",
    "024_notification_prefs_noop.sql",
    "025_user_soft_delete.sql",
    "026_modification_request_statuses.sql",
    "027_service_requests_staff_notes.sql",
    "028_customer_document_review.sql",
]


def run_migrations():
    print("Connecting to Neon DB...")
    try:
        conn = psycopg2.connect(DSN)
        conn.autocommit = False
        cur = conn.cursor()
        print("Connected.\n")
    except Exception as e:
        print(f"[FATAL] Could not connect to database: {e}")
        sys.exit(1)

    all_ok = True

    for filename in MIGRATIONS:
        filepath = os.path.join(MIGRATIONS_DIR, filename)
        print(f">> Running: {filename}")

        if not os.path.exists(filepath):
            print(f"   [SKIP] File not found: {filepath}")
            continue

        with open(filepath, "r", encoding="utf-8") as f:
            sql = f.read()

        try:
            cur.execute(sql)
            conn.commit()
            print(f"   [OK] {filename}\n")
        except Exception as e:
            conn.rollback()
            print(f"   [FAIL] {filename}")
            print(f"   Error: {e}\n")
            all_ok = False
            break

    cur.close()
    conn.close()

    if all_ok:
        print("All migrations completed successfully.")
    else:
        print("Migration run stopped. See error above.")
        sys.exit(1)


if __name__ == "__main__":
    run_migrations()
