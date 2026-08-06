import os
import sys
from pathlib import Path
from sqlalchemy import select

os.environ["DATABASE_URL"] = "sqlite:///./data/africensus_test.db"

import pytest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import Base, engine, get_db
from app.models import User
from app.schemas import Role
from app.security import hash_password

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=engine)
        
    Base.metadata.create_all(bind=engine)
    
    with next(get_db()) as db:
        # Create admin user for auth tests
        admin = User(
            id="admin-test-id-auth",
            username="admin",
            full_name="Admin Auth",
            email="admin@test.local",
            password_hash=hash_password("admin123"),
            role=Role.ADMIN,
            active=True,
            zone_ids=[]
        )
        db.add(admin)
        db.commit()
