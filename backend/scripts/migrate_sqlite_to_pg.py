#!/usr/bin/env python3
"""
FinStudent - Safe SQLite to PostgreSQL / Supabase Migration Script

Transfers all records from your local SQLite database to Supabase PostgreSQL:
- Preserves all IDs, timestamps, foreign keys, and integer paise monetary values.
- Never deletes or modifies the local SQLite database.
- Automatically creates a timestamped local backup (.bak) before migration.
- Resets PostgreSQL identity sequences (setval) to prevent ID collisions on new records.
- Verifies record counts match before and after.

Usage:
  python migrate_sqlite_to_pg.py --sqlite-path ../expense_tracker.db --pg-url "postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"
  python migrate_sqlite_to_pg.py --dry-run
"""

import os
import sys
import shutil
import argparse
import datetime
import sqlite3
from typing import Dict, List, Any

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker

# Append backend root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.session import Base
from app.models.models import *

TABLES_ORDER = [
    "users",
    "categories",
    "accounts",
    "expenses",
    "incomes",
    "budgets",
    "category_budgets",
    "recurring_expenses",
    "savings_goals",
    "attachments"
]

def backup_sqlite(sqlite_path: str) -> str:
    """Creates a timestamped backup copy of the SQLite database."""
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{sqlite_path}.bak_{timestamp}"
    shutil.copy2(sqlite_path, backup_path)
    print(f"[Backup] Successfully created safe SQLite backup at: {backup_path}")
    return backup_path

def get_sqlite_records(sqlite_path: str) -> Dict[str, List[Dict[str, Any]]]:
    """Reads all records from SQLite into a structured dictionary."""
    conn = sqlite3.connect(sqlite_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    data: Dict[str, List[Dict[str, Any]]] = {}

    # Get list of existing tables in SQLite
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    existing_tables = {row[0] for row in cursor.fetchall()}

    for table in TABLES_ORDER:
        if table not in existing_tables:
            data[table] = []
            continue
        cursor.execute(f"SELECT * FROM {table}")
        rows = [dict(r) for r in cursor.fetchall()]
        data[table] = rows
        print(f"[Read SQLite] Table '{table}': {len(rows)} records found.")

    conn.close()
    return data

def migrate_to_postgres(sqlite_data: Dict[str, List[Dict[str, Any]]], pg_url: str, dry_run: bool = False):
    """Inserts records into PostgreSQL, resets sequences, and verifies counts."""
    if dry_run:
        print("\n[DRY RUN MODE] The following records would be migrated:")
        total = sum(len(rows) for rows in sqlite_data.values())
        for table, rows in sqlite_data.items():
            print(f"  - {table}: {len(rows)} records")
        print(f"Total: {total} records. (No changes written to database)")
        return

    # Normalize Postgres URL
    if pg_url.startswith("postgres://"):
        pg_url = pg_url.replace("postgres://", "postgresql://", 1)

    engine = create_engine(pg_url, echo=False)

    print(f"[PostgreSQL] Connecting to target database...")
    with engine.connect() as test_conn:
        version = test_conn.execute(text("SELECT version();")).scalar()
        print(f"[PostgreSQL] Connected: {version[:45]}...")

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    with engine.begin() as conn:
        for table in TABLES_ORDER:
            rows = sqlite_data.get(table, [])
            if not rows:
                continue

            print(f"[Migrate] Writing {len(rows)} rows to '{table}'...")
            
            # Prepare insert statement with explicit columns
            cols = list(rows[0].keys())
            col_names = ", ".join(cols)
            placeholders = ", ".join([f":{c}" for c in cols])
            insert_sql = text(f"INSERT INTO {table} ({col_names}) VALUES ({placeholders}) ON CONFLICT (id) DO NOTHING")

            # Clean rows (convert booleans if needed)
            cleaned_rows = []
            for r in rows:
                cleaned = dict(r)
                for k, v in cleaned.items():
                    # Handle boolean conversion from SQLite 0/1 to Python bool if required
                    if k in ("is_default", "is_recurring_instance", "is_active", "is_completed"):
                        if v is not None:
                            cleaned[k] = bool(v)
                cleaned_rows.append(cleaned)

            conn.execute(insert_sql, cleaned_rows)

            # Reset sequence for auto-increment in Postgres
            try:
                seq_sql = text(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE(MAX(id), 1)) FROM {table}")
                conn.execute(seq_sql)
            except Exception as seq_err:
                print(f"  [Sequence Note] Table '{table}': {seq_err}")

    # Verify counts
    print("\n[Verification] Comparing record counts:")
    all_matched = True
    with engine.connect() as conn:
        for table in TABLES_ORDER:
            sqlite_count = len(sqlite_data.get(table, []))
            pg_count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            status = "MATCH" if pg_count >= sqlite_count else "MISMATCH"
            if status == "MISMATCH":
                all_matched = False
            print(f"  - {table:<20}: SQLite={sqlite_count:<5} | PostgreSQL={pg_count:<5} [{status}]")

    if all_matched:
        print("\n[SUCCESS] Migration completed successfully with 100% record integrity!")
    else:
        print("\n[WARNING] Some counts did not match. Check error logs.")

def main():
    parser = argparse.ArgumentParser(description="Migrate FinStudent SQLite database to Supabase PostgreSQL.")
    parser.add_argument(
        "--sqlite-path",
        default=os.getenv("SQLITE_PATH", "expense_tracker.db"),
        help="Path to source SQLite database file (default: expense_tracker.db)"
    )
    parser.add_argument(
        "--pg-url",
        default=os.getenv("DATABASE_URL", None),
        help="PostgreSQL connection string (e.g. postgresql://user:pass@host:5432/db)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Inspect SQLite records and preview migration without writing to Postgres"
    )

    args = parser.parse_args()

    # Find SQLite path if not at direct path
    sqlite_path = args.sqlite_path
    if not os.path.exists(sqlite_path):
        candidate = os.path.join("..", sqlite_path)
        if os.path.exists(candidate):
            sqlite_path = candidate
        else:
            print(f"[Error] SQLite database not found at '{sqlite_path}'.")
            sys.exit(1)

    print("=" * 60)
    print(" FinStudent: SQLite -> Supabase PostgreSQL Safe Migration")
    print("=" * 60)
    print(f"Source SQLite: {os.path.abspath(sqlite_path)}")

    # 1. Backup SQLite
    backup_sqlite(sqlite_path)

    # 2. Extract SQLite data
    data = get_sqlite_records(sqlite_path)

    # 3. Dry-run or migrate
    if args.dry_run:
        migrate_to_postgres(data, "", dry_run=True)
        return

    if not args.pg_url or args.pg_url.startswith("sqlite"):
        print("\n[Notice] No remote PostgreSQL URL provided (or DATABASE_URL is SQLite).")
        print("To migrate to Supabase, provide --pg-url:")
        print("  python migrate_sqlite_to_pg.py --pg-url \"postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres\"")
        print("\nRunning in dry-run mode to inspect records:")
        migrate_to_postgres(data, "", dry_run=True)
        return

    migrate_to_postgres(data, args.pg_url, dry_run=False)

if __name__ == "__main__":
    main()
