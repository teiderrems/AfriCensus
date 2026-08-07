import os
import sys
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite:///./data/africensus_test.db"

from fastapi.testclient import TestClient
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.database import get_db
from app.models import Person, User, Zone, Household
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

def _create_person():
    token = create_auth_token("AGENT", "zone1")
    
    # First create a household for the person
    hh_payload = {
        "zone_id": "zone1",
        "campaign_id": "camp1",
        "household_code": "HH-P-001",
        "address_text": "123 Main St"
    }
    response_hh = client.post("/api/v1/households", json=hh_payload, headers={"Authorization": f"Bearer {token}"})
    hh_id = response_hh.json()["id"]

    payload = {
        "zone_id": "zone1",
        "campaign_id": "camp1",
        "household_id": hh_id,
        "first_name": "John",
        "last_name": "Doe",
        "gender": "M",
        "date_of_birth": "1990-01-01"
    }
    response = client.post("/api/v1/persons", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 201
    data = response.json()
    assert data["first_name"] == "John"
    assert data["last_name"] == "Doe"
    assert data["validation_status"] == "DRAFT"
    return data["id"]

def test_create_person():
    _create_person()

def test_get_person():
    p_id = _create_person()
    token = create_auth_token("AGENT", "zone1")
    response = client.get(f"/api/v1/persons/{p_id}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["id"] == p_id

def test_list_persons():
    token = create_auth_token("AGENT", "zone1")
    response = client.get("/api/v1/persons?zone_id=zone1", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data

def test_update_person():
    p_id = _create_person()
    token = create_auth_token("AGENT", "zone1")
    
    # Needs to get household_id first or we will get validation errors if we omit required fields
    response_get = client.get(f"/api/v1/persons/{p_id}", headers={"Authorization": f"Bearer {token}"})
    hh_id = response_get.json()["household_id"]
    
    payload = {
        "zone_id": "zone1",
        "campaign_id": "camp1",
        "household_id": hh_id,
        "first_name": "Jane",
        "last_name": "Doe",
        "gender": "F",
        "date_of_birth": "1990-01-01"
    }
    response = client.put(f"/api/v1/persons/{p_id}", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["first_name"] == "Jane"

def test_submit_person():
    p_id = _create_person()
    token = create_auth_token("AGENT", "zone1")
    response = client.post(f"/api/v1/persons/{p_id}/submit", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["validation_status"] == "SUBMITTED"

def test_validate_person():
    p_id = _create_person()
    admin_token = create_auth_token("ADMIN", "zone1")
    response = client.post(f"/api/v1/persons/{p_id}/validate", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    assert response.json()["validation_status"] == "VALIDATED"

def test_reject_person():
    p_id = _create_person()
    admin_token = create_auth_token("ADMIN", "zone1")
    payload = {"comment": "Invalid data"}
    response = client.post(f"/api/v1/persons/{p_id}/reject", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    assert response.json()["validation_status"] == "REJECTED"
    assert response.json()["decision_comment"] == "Invalid data"

def test_request_correction_person():
    p_id = _create_person()
    admin_token = create_auth_token("ADMIN", "zone1")
    payload = {"comment": "Please fix name"}
    response = client.post(f"/api/v1/persons/{p_id}/request-correction", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    assert response.json()["validation_status"] == "NEEDS_CORRECTION"
    assert response.json()["decision_comment"] == "Please fix name"

def test_delete_person():
    p_id = _create_person()
    token = create_auth_token("AGENT", "zone1")
    response = client.delete(f"/api/v1/persons/{p_id}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 204
    
    response = client.get(f"/api/v1/persons/{p_id}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 404

def test_get_duplicates():
    p_id = _create_person()
    token = create_auth_token("AGENT", "zone1")
    response = client.get(f"/api/v1/persons/{p_id}/duplicates", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_relations():
    p_id = _create_person()
    token = create_auth_token("AGENT", "zone1")
    response = client.get(f"/api/v1/persons/{p_id}/relations", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert isinstance(response.json(), list)
