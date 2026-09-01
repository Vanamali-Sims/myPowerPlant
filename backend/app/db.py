"""
Async SQLAlchemy engine and session factory.

DATABASE_URL must be set before import. Locally that is the Docker Postgres
container; in AWS it is the Aurora / RDS connection string.
"""
import os
from collections.abc import AsyncGenerator

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Copy backend/.env.example to backend/.env."
    )

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    get_session

    Yields:
        AsyncSession: A request-scoped SQLAlchemy session.

    FastAPI Depends() uses this so each request gets its own session.
    The context manager closes the session when the request finishes.
    """
    async with async_session_factory() as session:
        yield session
