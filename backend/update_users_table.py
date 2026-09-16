"""
Database Migration Script for STEP 13.1 & 13.2 — User Model Schema Update
Removes NOT NULL constraint from legacy 'hashed_password' column to allow 'password_hash' usage cleanly.
"""

import sys
import psycopg2

DB_URI = "postgresql://postgres:Singh@localhost:5432/cmpdi_document_ai"


def migrate_users_table():
    print("Connecting to PostgreSQL database...")
    conn = psycopg2.connect(DB_URI)
    conn.autocommit = True
    cur = conn.cursor()

    try:
        # 1. Drop NOT NULL on legacy hashed_password column if present
        print("Dropping NOT NULL constraint on legacy 'hashed_password' column...")
        cur.execute("ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL;")
        
        # 2. Make password_hash NOT NULL if present
        cur.execute("ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;")
        
        print("[SUCCESS] Legacy constraint update completed successfully!")

    except Exception as exc:
        print(f"[ERROR] Migration failed: {exc}")
        sys.exit(1)
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    migrate_users_table()
