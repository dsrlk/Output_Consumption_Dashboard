import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Support DATABASE_URL env var for production (PostgreSQL on Render/Railway)
# Falls back to local SQLite for development
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Production: PostgreSQL (Railway/Render sets this automatically)
    # Railway uses postgres:// but SQLAlchemy needs postgresql://
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URL = DATABASE_URL
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
else:
    # SQLite fallback: DB confirmed to live at /app/data.db on Railway
    # Using env var DB_PATH to allow override; defaults to absolute /app/data.db
    import glob
    _default_db = "/app/data.db"
    # Also check working dir in case of local dev
    _local_db = os.path.join(os.getcwd(), "data.db")
    if os.path.exists(_local_db):
        _default_db = _local_db
    DB_PATH = os.environ.get("DB_PATH", _default_db)
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
