import os
from pathlib import Path

import sqlite3 as _sqlite3
from dotenv import load_dotenv

load_dotenv()

try:
    import libsql_experimental as _libsql
except ImportError:
    _libsql = None

TURSO_DATABASE_URL = os.getenv("TURSO_DATABASE_URL", "").strip()
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN", "").strip()

DB_FILE = Path(__file__).resolve().parent / "crucible.db"

_USE_REMOTE = bool(TURSO_DATABASE_URL) and _libsql is not None


def get_conn():
    if _USE_REMOTE:
        return _libsql.connect(TURSO_DATABASE_URL, auth_token=TURSO_AUTH_TOKEN)
    return _sqlite3.connect(str(DB_FILE))


IntegrityError = (
    (_sqlite3.IntegrityError, ValueError)
    if _USE_REMOTE
    else _sqlite3.IntegrityError
)
