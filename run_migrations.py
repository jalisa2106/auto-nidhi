"""
Deploy all SQL migration files to Neon database.
Uses a proper SQL splitter that handles dollar-quoted strings (triggers).
"""
import os, sys, psycopg2, re
from dotenv import load_dotenv
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

load_dotenv(dotenv_path=Path('server/.env'))
DATABASE_URL = os.getenv('DATABASE_URL')

conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cur = conn.cursor()


def split_sql_statements(sql):
    """
    Properly split SQL into individual statements, handling:
    - Dollar-quoted strings ($$...$$) used in PL/pgSQL functions/triggers
    - Single-quoted string literals
    - Single-line (-- ...) comments
    - Semicolons inside strings/dollar-quotes are NOT treated as separators
    """
    statements = []
    current = []
    i = 0
    in_dollar_quote = False
    dollar_tag = ''
    in_single_quote = False
    in_line_comment = False

    while i < len(sql):
        ch = sql[i]

        # Handle line comments
        if not in_single_quote and not in_dollar_quote and sql[i:i+2] == '--':
            end = sql.find('\n', i)
            if end == -1:
                break
            current.append(sql[i:end+1])
            i = end + 1
            continue

        # Handle dollar-quoted strings (e.g. $$ ... $$ or $BODY$ ... $BODY$)
        if not in_single_quote and not in_dollar_quote and ch == '$':
            # Try to match a dollar tag like $$ or $tag$
            match = re.match(r'\$([A-Za-z_]*)\$', sql[i:])
            if match:
                dollar_tag = match.group(0)
                in_dollar_quote = True
                current.append(sql[i:i+len(dollar_tag)])
                i += len(dollar_tag)
                continue

        if in_dollar_quote:
            if sql[i:i+len(dollar_tag)] == dollar_tag:
                current.append(dollar_tag)
                i += len(dollar_tag)
                in_dollar_quote = False
                dollar_tag = ''
                continue
            current.append(ch)
            i += 1
            continue

        # Handle single-quoted strings
        if ch == "'" and not in_dollar_quote:
            in_single_quote = not in_single_quote
            current.append(ch)
            i += 1
            continue

        # Statement separator
        if ch == ';' and not in_single_quote and not in_dollar_quote:
            stmt = ''.join(current).strip()
            # Remove comment-only lines to check if real SQL exists
            real_lines = [l for l in stmt.splitlines() if l.strip() and not l.strip().startswith('--')]
            if real_lines:
                statements.append(stmt)
            current = []
            i += 1
            continue

        current.append(ch)
        i += 1

    # Handle any remaining content after last semicolon
    if current:
        stmt = ''.join(current).strip()
        real_lines = [l for l in stmt.splitlines() if l.strip() and not l.strip().startswith('--')]
        if real_lines:
            statements.append(stmt)

    return statements


sql_dir = Path('database/database')
files = sorted([f for f in sql_dir.glob('*.sql') if f.name != 'init.sql'])

total_ok = 0
total_err = 0
all_errors = []

for sql_file in files:
    print(f"\n=== Running: {sql_file.name} ===")
    sql = sql_file.read_bytes().decode('utf-8-sig')
    statements = split_sql_statements(sql)

    ok_count = 0
    err_count = 0
    for stmt in statements:
        try:
            cur.execute(stmt)
            ok_count += 1
        except Exception as e:
            err_msg = str(e).splitlines()[0]
            print(f"  WARN: {err_msg}")
            err_count += 1
            all_errors.append(f"{sql_file.name}: {err_msg}")

    print(f"  Result: {ok_count} OK, {err_count} warnings")
    total_ok += ok_count
    total_err += err_count

# Verify: list all tables
print("\n=== Tables in Database ===")
cur.execute("""
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
""")
tables = cur.fetchall()
for t in tables:
    print(f"  - {t[0]}")
print(f"\nTotal tables: {len(tables)}")

# Verify: list all enums
print("\n=== ENUMs in Database ===")
cur.execute("""
    SELECT t.typname FROM pg_type t
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e'
    ORDER BY t.typname;
""")
enums = cur.fetchall()
for e in enums:
    print(f"  - {e[0]}")
print(f"\nTotal enums: {len(enums)}")

# Verify: roles seeded
print("\n=== Roles in master_role ===")
try:
    cur.execute("SELECT role_name, description FROM master_role ORDER BY role_name;")
    roles = cur.fetchall()
    for r in roles:
        print(f"  - {r[0]}: {r[1]}")
    print(f"Total roles: {len(roles)}")
except Exception as e:
    print(f"  Could not query master_role: {e}")

conn.close()
print(f"\nDone! Total: {total_ok} OK, {total_err} warnings across all files.")
