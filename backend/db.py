import asyncio
import os
from typing import Optional

from dotenv import load_dotenv
from psycopg import AsyncConnection
from psycopg.errors import UniqueViolation
from psycopg_pool import AsyncConnectionPool

load_dotenv()

SUPABASE_DATABASE_URL = os.getenv("SUPABASE_DATABASE_URL", "").strip()

_pool: Optional[AsyncConnectionPool] = None
_pool_loop: Optional[asyncio.AbstractEventLoop] = None


async def get_pool() -> AsyncConnectionPool:
    global _pool, _pool_loop
    loop = asyncio.get_running_loop()
    if _pool is None or _pool_loop is not loop:
        if _pool is not None:
            try:
                await _pool.close()
            except Exception:
                pass
            _pool = None
        if not SUPABASE_DATABASE_URL:
            raise RuntimeError("SUPABASE_DATABASE_URL is not set in .env")
        _pool = AsyncConnectionPool(
            SUPABASE_DATABASE_URL,
            open=False,
            min_size=1,
            max_size=10,
            kwargs={"autocommit": False, "prepare_threshold": None},
        )
        _pool_loop = loop
        await _pool.open()
        await _pool.wait(timeout=30)
    return _pool


async def get_conn() -> AsyncConnection:
    pool = await get_pool()
    return await pool.getconn()


async def put_conn(conn: AsyncConnection) -> None:
    """Return a connection to the pool, rolling back any open transaction."""
    pool = await get_pool()
    await pool.putconn(conn)


async def close_pool() -> None:
    global _pool, _pool_loop
    if _pool is not None:
        await _pool.close()
        _pool = None
        _pool_loop = None


IntegrityError = UniqueViolation
