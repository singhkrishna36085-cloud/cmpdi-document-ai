"""
Database Migration Script for STEP 13.4 — Document Confidentiality & RBAC Field Update
Adds 'is_confidential' (BOOLEAN, DEFAULT FALSE) column to 'documents' table in PostgreSQL.
"""

import sys
import psycopg2

DB_URI = "postgresql://postgres:Singh@localhost:5432/cmpdi_document_ai"


def update_documents_table():
    print("Connecting to PostgreSQL database...")
    conn = psycopg2.connect(DB_URI)
    conn.autocommit = True
    cur = conn.cursor()

    try:
        # Check existing columns
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'documents';
        """)
        existing_cols = {row[0] for row in cur.fetchall()}
        
        if "is_confidential" not in existing_cols:
            print("Adding 'is_confidential' column to 'documents' table...")
            cur.execute("ALTER TABLE documents ADD COLUMN is_confidential BOOLEAN DEFAULT FALSE;")
            cur.execute("UPDATE documents SET is_confidential = FALSE WHERE is_confidential IS NULL;")

        print("[SUCCESS] Documents confidentiality migration completed successfully!")

    except Exception as exc:
        print(f"[ERROR] Migration failed: {exc}")
        sys.exit(1)
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    update_documents_table()
