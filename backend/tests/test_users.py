import os
import sys
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite:///./data/africensus_test.db"

from fastapi.testclient import TestClient
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.database import get_db, Base, engine
from app.models import User
from app.schemas import Role
from sqlalchemy import select

# Recreate DB tables for testing
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def get_admin_token():
    with next(get_db()) as db:
        admin_user = db.scalar(select(User).where(User.username == "testadmin"))
        if not admin_user:
            admin_user = User(
                id="admin-test-id",
                username="testadmin",
                full_name="Test Admin",
                email="testadmin@test.local",
                password_hash="testhash",
                role=Role.ADMIN,
                active=True,
                zone_ids=[]
            )
            db.add(admin_user)
            db.commit()
            
    from app.security import create_token
    return create_token("admin-test-id", Role.ADMIN)

def test_create_user():
    token = get_admin_token()
    response = client.post(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "username": "newagent",
            "full_name": "New Agent",
            "role": "AGENT",
            "password": "strongpassword123",
            "active": True,
            "zone_ids": []
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "newagent"
    assert data["role"] == "AGENT"
    assert "password_hash" not in data

def test_list_users():
    token = get_admin_token()
    response = client.get(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) >= 1

def test_get_user():
    token = get_admin_token()
    # Find user created in test_create_user
    res = client.get("/api/v1/users", headers={"Authorization": f"Bearer {token}"})
    user_id = [u["id"] for u in res.json()["items"] if u["username"] == "newagent"][0]

    response = client.get(
        f"/api/v1/users/{user_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["username"] == "newagent"

def test_update_user():
    token = get_admin_token()
    res = client.get("/api/v1/users", headers={"Authorization": f"Bearer {token}"})
    user_id = [u["id"] for u in res.json()["items"] if u["username"] == "newagent"][0]

    response = client.put(
        f"/api/v1/users/{user_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "full_name": "Updated Agent Name"
        }
    )
    assert response.status_code == 200
    assert response.json()["full_name"] == "Updated Agent Name"

def test_change_user_role():
    token = get_admin_token()
    res = client.get("/api/v1/users", headers={"Authorization": f"Bearer {token}"})
    user_id = [u["id"] for u in res.json()["items"] if u["username"] == "newagent"][0]

    response = client.post(
        f"/api/v1/users/{user_id}/role",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "SUPERVISOR"}
    )
    assert response.status_code == 200
    assert response.json()["role"] == "SUPERVISOR"

def test_deactivate_user():
    token = get_admin_token()
    res = client.get("/api/v1/users", headers={"Authorization": f"Bearer {token}"})
    user_id = [u["id"] for u in res.json()["items"] if u["username"] == "newagent"][0]

    response = client.post(
        f"/api/v1/users/{user_id}/deactivate",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["active"] is False

def test_activate_user():
    token = get_admin_token()
    res = client.get("/api/v1/users", headers={"Authorization": f"Bearer {token}"})
    user_id = [u["id"] for u in res.json()["items"] if u["username"] == "newagent"][0]

    response = client.post(
        f"/api/v1/users/{user_id}/activate",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["active"] is True

def test_delete_user():
    token = get_admin_token()
    res = client.get("/api/v1/users", headers={"Authorization": f"Bearer {token}"})
    user_id = [u["id"] for u in res.json()["items"] if u["username"] == "newagent"][0]

    response = client.delete(
        f"/api/v1/users/{user_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 204

    # Verify deleted
    get_res = client.get(f"/api/v1/users/{user_id}", headers={"Authorization": f"Bearer {token}"})
    assert get_res.status_code == 404
