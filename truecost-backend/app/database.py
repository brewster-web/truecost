import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.config import settings


# Convert the URL to async format
# postgresql://... becomes postgresql+asyncpg://...
database_url = settings.database_url.replace(
    "postgresql://", "postgresql+asyncpg://"
)

# echo = True only when DB_ECHO=true in .env - never in production
db_echo = os.getenv("DB_ECHO", "false").lower() == "true"

engine = create_async_engine(database_url, echo=db_echo)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session