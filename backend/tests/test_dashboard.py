import os
import sys
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite:///./data/africensus_test.db"

from fastapi.testclient import TestClient
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.database import get_db
from app.models import User
from app.schemas import Role
from sqlalchemy import select
from app.security import create_token

client = TestClient(app)

def get_admin_token():
    with next(get_db()) as db:
        admin_user = db.scalar(select(User).where(User.username == "dashadmin"))
        if not admin_user:
            admin_user = User(
                id="dash-admin-id",
                username="dashadmin",
                full_name="Dash Admin",
                email="dashadmin@test.local",
                password_hash="testhash",
                role=Role.ADMIN,
                active=True,
                zone_ids=[]
            )
            db.add(admin_user)
            db.commit()
    return create_token("dash-admin-id", Role.ADMIN)

def get_agent_token():
    with next(get_db()) as db:
        agent_user = db.scalar(select(User).where(User.username == "dashagent"))
        if not agent_user:
            agent_user = User(
                id="dash-agent-id",
                username="dashagent",
                full_name="Dash Agent",
                email="dashagent@test.local",
                password_hash="testhash",
                role=Role.AGENT,
                active=True,
                zone_ids=[]
            )
            db.add(agent_user)
            db.commit()
    return create_token("dash-agent-id", Role.AGENT)

def test_dashboard_summary_admin():
    token = get_admin_token()
    response = client.get("/api/v1/dashboard/summary", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert "totalPersons" in data
    assert "totalHouseholds" in data
    assert "submitted" in data
    assert "validated" in data
    assert "needsCorrection" in data
    assert "potentialDuplicates" in data
    assert "activeAgents" in data
    assert "zoneProgress" in data
    assert "recentSubmissions" in data

def test_dashboard_summary_agent():
    token = get_agent_token()
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/dashboard/summary", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["zoneProgress"], list)

def test_dashboard_analytics():
    token = get_admin_token()
    response = client.get("/api/v1/dashboard/analytics", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert "genderDistribution" in data
    assert "ageGroups" in data
    assert "validationBreakdown" in data
    assert "submissionsTrend" in data
    assert "zoneComparison" in data
