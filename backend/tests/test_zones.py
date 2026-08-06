import os
import sys
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite:///./data/africensus_test.db"

from fastapi.testclient import TestClient
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.database import get_db, Base, engine
from app.models import User, Zone
from app.schemas import Role
from sqlalchemy import select
from uuid import uuid4

Base.metadata.create_all(bind=engine)
client = TestClient(app)

def get_admin_token():
    with next(get_db()) as db:
        admin_user = db.scalar(select(User).where(User.username == "testadmin_zone"))
        if not admin_user:
            admin_user = User(
                id="admin-test-id-zone",
                username="testadmin_zone",
                full_name="Test Admin Zone",
                email="adminzone@test.local",
                password_hash="testhash",
                role=Role.ADMIN,
                active=True,
                zone_ids=[]
            )
            db.add(admin_user)
            db.commit()
            
    from app.security import create_token
    return create_token("admin-test-id-zone", Role.ADMIN)

def test_create_zone():
    token = get_admin_token()
    response = client.post(
        "/api/v1/zones",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "code": "Z-TEST",
            "name": {"fr": "Zone de Test"},
            "type": "REGION"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["code"] == "Z-TEST"
    assert data["name"]["fr"] == "Zone de Test"
    assert data["type"] == "REGION"

def test_list_zones():
    token = get_admin_token()
    response = client.get(
        "/api/v1/zones",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) >= 1

def test_get_zone():
    token = get_admin_token()
    # Find zone
    res = client.get("/api/v1/zones", headers={"Authorization": f"Bearer {token}"})
    zone_id = [z["id"] for z in res.json()["items"] if z["code"] == "Z-TEST"][0]

    response = client.get(
        f"/api/v1/zones/{zone_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["code"] == "Z-TEST"

def test_update_zone():
    token = get_admin_token()
    res = client.get("/api/v1/zones", headers={"Authorization": f"Bearer {token}"})
    zone_id = [z["id"] for z in res.json()["items"] if z["code"] == "Z-TEST"][0]

    response = client.put(
        f"/api/v1/zones/{zone_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "code": "Z-TEST-UPDATED",
            "name": {"fr": "Zone de Test Updated"},
            "type": "REGION"
        }
    )
    assert response.status_code == 200
    assert response.json()["code"] == "Z-TEST-UPDATED"

def test_delete_zone():
    token = get_admin_token()
    res = client.get("/api/v1/zones", headers={"Authorization": f"Bearer {token}"})
    zone_id = [z["id"] for z in res.json()["items"] if z["code"] == "Z-TEST-UPDATED"][0]

    response = client.delete(
        f"/api/v1/zones/{zone_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 204

    # Verification deletion (it's soft deleted so it should return 404 because db_find_or_404 excludes deleted)
    get_res = client.get(f"/api/v1/zones/{zone_id}", headers={"Authorization": f"Bearer {token}"})
    assert get_res.status_code == 404
