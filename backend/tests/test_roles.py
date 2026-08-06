import os
import sys
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite:///./data/africensus_test.db"

from fastapi.testclient import TestClient
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.database import get_db, Base, engine
from app.models import User, AppRole
from app.schemas import Role
from sqlalchemy import select

Base.metadata.create_all(bind=engine)
client = TestClient(app)

def get_admin_token():
    with next(get_db()) as db:
        admin_user = db.scalar(select(User).where(User.username == "testadmin_role"))
        if not admin_user:
            admin_user = User(
                id="admin-test-id-role",
                username="testadmin_role",
                full_name="Test Admin Role",
                email="adminrole@test.local",
                password_hash="testhash",
                role=Role.ADMIN,
                active=True,
                zone_ids=[]
            )
            db.add(admin_user)
            db.commit()
            
    from app.security import create_token
    return create_token("admin-test-id-role", Role.ADMIN)

def test_get_permissions():
    token = get_admin_token()
    response = client.get(
        "/api/v1/roles/permissions/available",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "module" in data[0]

def test_create_role():
    token = get_admin_token()
    response = client.post(
        "/api/v1/roles",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Custom Role 2",
            "description": "Test custom role",
            "permissions": ["users:read", "persons:read"]
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "CUSTOM_ROLE_2"
    assert "users:read" in data["permissions"]

def test_list_roles():
    token = get_admin_token()
    response = client.get(
        "/api/v1/roles",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1

def test_update_role():
    token = get_admin_token()
    res = client.get("/api/v1/roles", headers={"Authorization": f"Bearer {token}"})
    role_id = [r["id"] for r in res.json() if r["name"] == "CUSTOM_ROLE_2"][0]

    response = client.put(
        f"/api/v1/roles/{role_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Custom Role Updated",
            "description": "Updated description",
            "permissions": ["users:read", "users:write"]
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "CUSTOM_ROLE_UPDATED"
    assert "users:write" in data["permissions"]

def test_delete_role():
    token = get_admin_token()
    res = client.get("/api/v1/roles", headers={"Authorization": f"Bearer {token}"})
    role_id = [r["id"] for r in res.json() if r["name"] == "CUSTOM_ROLE_UPDATED"][0]

    response = client.delete(
        f"/api/v1/roles/{role_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 204

    # Verify
    get_res = client.get(f"/api/v1/roles/{role_id}", headers={"Authorization": f"Bearer {token}"})
    assert get_res.status_code == 404
