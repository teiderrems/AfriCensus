from collections.abc import Generator
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()
db_url = settings.database_url

if db_url.startswith("sqlite"):
    db_path = db_url.removeprefix("sqlite:///")
    if db_path and db_path != ":memory:":
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)

connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}

try:
    engine = create_engine(db_url, pool_pre_ping=True, connect_args=connect_args)
    with engine.connect() as _conn:
        pass
except Exception as _e:
    print(f"[DB Fallback SQLite] Database unavailable ({_e}). Falling back to local SQLite.")
    fallback_path = Path("./data/africensus.db")
    fallback_path.parent.mkdir(parents=True, exist_ok=True)
    db_url = f"sqlite:///{fallback_path.as_posix()}"
    engine = create_engine(db_url, pool_pre_ping=True, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


try:
    from .init_db import init_db
    with SessionLocal() as _db:
        init_db(_db)
except Exception as _e:
    print(f"[DB Auto-Init Warning] {_e}")
