import os
import sys
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite:///./data/africensus_test.db"

from fastapi.testclient import TestClient
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.database import get_db
from app.models import Household, User, Zone
from app.security import create_token
from sqlalchemy import select

client = TestClient(app)

def create_auth_token(role="AGENT", zone_id="zone1"):
    with next(get_db()) as db:
        user = db.scalar(select(User).where(User.username == f"user_{role}"))
        if not user:
            user = User(
                id=f"user_id_{role}",
                username=f"user_{role}",
                full_name=f"Test {role}",
                email=f"{role}@test.local",
                password_hash="test",
                role=role,
                active=True,
                zone_ids=[zone_id]
            )
            db.add(user)
            db.commit()
            
        zone = db.scalar(select(Zone).where(Zone.id == zone_id))
        if not zone:
            zone = Zone(id=zone_id, code="Z1", name={"fr": "Zone 1"}, type="province")
            db.add(zone)
            db.commit()
            
        return create_token(user.id, user.role)

def _create_household():
    token = create_auth_token("AGENT", "zone1")
    payload = {
        "zone_id": "zone1",
        "campaign_id": "camp1",
        "household_code": "HH-001",
        "address_text": "123 Main St"
    }
    response = client.post("/api/v1/households", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 201
    data = response.json()
    assert data["address_text"] == "123 Main St"
    assert data["validation_status"] == "DRAFT"
    return data["id"]

def test_create_household():
    _create_household()

def test_get_household():
    h_id = _create_household()
    token = create_auth_token("AGENT", "zone1")
    response = client.get(f"/api/v1/households/{h_id}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["id"] == h_id

def test_list_households():
    token = create_auth_token("AGENT", "zone1")
    response = client.get("/api/v1/households?zone_id=zone1", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data

def test_update_household():
    h_id = _create_household()
    token = create_auth_token("AGENT", "zone1")
    payload = {
        "zone_id": "zone1",
        "campaign_id": "camp1",
        "household_code": "HH-001",
        "address_text": "456 New St"
    }
    response = client.put(f"/api/v1/households/{h_id}", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["address_text"] == "456 New St"

def test_submit_household():
    h_id = _create_household()
    token = create_auth_token("AGENT", "zone1")
    response = client.post(f"/api/v1/households/{h_id}/submit", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["validation_status"] == "SUBMITTED"

def test_validate_household():
    h_id = _create_household()
    admin_token = create_auth_token("ADMIN", "zone1")
    response = client.post(f"/api/v1/households/{h_id}/validate", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    assert response.json()["validation_status"] == "VALIDATED"

def test_reject_household():
    h_id = _create_household()
    admin_token = create_auth_token("ADMIN", "zone1")
    payload = {"comment": "Invalid data"}
    response = client.post(f"/api/v1/households/{h_id}/reject", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    assert response.json()["validation_status"] == "REJECTED"
    assert response.json()["decision_comment"] == "Invalid data"

def test_request_correction_household():
    h_id = _create_household()
    admin_token = create_auth_token("ADMIN", "zone1")
    payload = {"comment": "Please fix address"}
    response = client.post(f"/api/v1/households/{h_id}/request-correction", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    assert response.json()["validation_status"] == "NEEDS_CORRECTION"
    assert response.json()["decision_comment"] == "Please fix address"

def test_delete_household():
    h_id = _create_household()
    token = create_auth_token("AGENT", "zone1")
    response = client.delete(f"/api/v1/households/{h_id}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 204
    
    response = client.get(f"/api/v1/households/{h_id}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 404
