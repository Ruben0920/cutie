"""FastAPI application entrypoint with lifespan DB verification and OpenAPI tags."""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routers import auth, couple, cycle, dates, gifts, interactions, ws
from app.core.config import settings
from app.core.database import Base, engine, get_db

logger = logging.getLogger(__name__)

OPENAPI_TAGS = [
    {"name": "Health", "description": "Database connectivity and server liveness checks."},
    {"name": "Auth & User Preferences", "description": "Registration, JWT login, and partner preferences."},
    {"name": "Couple & Pairing", "description": "QR/code pairing, relationship profile, and live countdown."},
    {"name": "Ideas - Gifts Wishlist", "description": "Gift wishlists with secret partner reservations."},
    {"name": "Ideas - Date Ideas", "description": "Categorized date ideas, surprise masking, and evening lock-in."},
    {"name": "Adaptive Cycle Calendar", "description": "Adaptive floating window cycle engine and daily observations."},
    {"name": "Interactions & Smart Dice", "description": "Quick statuses, surprise triggers, and Smart Dice rolls."},
    {"name": "WebSocket Real-Time", "description": "Instant WebSocket synchronization between partners."},
]


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """Verify database connectivity on startup and dispose engine cleanly on shutdown."""
    try:
        if settings.DATABASE_URL.startswith("sqlite"):
            import app.models  # noqa: F401

            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connectivity verified at startup.")
    except Exception as exc:
        logger.warning("Startup DB connectivity check failed (non-fatal if overridden): %s", exc)

    yield

    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    openapi_tags=OPENAPI_TAGS,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(couple.router, prefix=settings.API_V1_PREFIX)
app.include_router(gifts.router, prefix=settings.API_V1_PREFIX)
app.include_router(dates.router, prefix=settings.API_V1_PREFIX)
app.include_router(cycle.router, prefix=settings.API_V1_PREFIX)
app.include_router(interactions.router, prefix=settings.API_V1_PREFIX)
app.include_router(ws.router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["Health"])
async def health_check(db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    """Return live database connectivity status and current UTC timestamp."""
    db_status = "connected"
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"

    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
