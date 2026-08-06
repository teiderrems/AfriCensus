import os
import sys
from pathlib import Path
from uuid import uuid4

os.environ["DATABASE_URL"] = "sqlite:///./data/africensus_test.db"

from fastapi.testclient import TestClient
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.api.routes.auth import _attempts
from app.security import create_token, hash_password
from app.database import get_db
from app.models import User
import datetime
from sqlalchemy import select

client = TestClient(app)

def test_login_force_password_change():
    _attempts.clear()
    # Let's create a user with force_password_change temporarily
    # Actually, modifying the DB is easier if we have a session
    with next(get_db()) as db:
        user = db.scalar(select(User).where(User.username == "admin"))
        old_force = getattr(user, "force_password_change", False)
        user.force_password_change = True
        db.commit()

        try:
            response = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
            assert response.status_code == 403
            assert response.json()["detail"] == "PASSWORD_EXPIRED"
        finally:
            user.force_password_change = old_force
            db.commit()

def test_login_password_expired():
    _attempts.clear()
    with next(get_db()) as db:
        user = db.scalar(select(User).where(User.username == "admin"))
        old_date = getattr(user, "password_changed_at", None)
        user.password_changed_at = "2020-01-01T00:00:00Z"
        db.commit()

        try:
            response = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
            assert response.status_code == 403
            assert response.json()["detail"] == "PASSWORD_EXPIRED"
        finally:
            user.password_changed_at = old_date
            db.commit()

def test_refresh_token_valid():
    _attempts.clear()
    # Get refresh token
    response = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    refresh_token = response.json()["refresh_token"]

    response = client.post("/api/v1/auth/refresh-token", json={"refresh_token": refresh_token})
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"

def test_refresh_token_invalid():
    _attempts.clear()
    response = client.post("/api/v1/auth/refresh-token", json={"refresh_token": "bad_token"})
    assert response.status_code == 401
    assert "Invalid token" in response.json()["detail"]

def test_refresh_token_inactive_user():
    _attempts.clear()
    # Create valid token for non-existent user
    token = create_token("missing-user-id", "admin", "refresh")
    response = client.post("/api/v1/auth/refresh-token", json={"refresh_token": token})
    assert response.status_code == 401
    assert "Inactive or unknown user" in response.json()["detail"]

def test_forgot_password():
    _attempts.clear()
    response = client.post("/api/v1/auth/forgot-password", json={"username_or_email": "admin"})
    assert response.status_code == 200
    assert "e-mail a été envoyé" in response.json()["message"]

def test_forgot_password_invalid_user():
    _attempts.clear()
    response = client.post("/api/v1/auth/forgot-password", json={"username_or_email": "doesntexist"})
    assert response.status_code == 200
    assert "e-mail a été envoyé" in response.json()["message"]

def test_reset_password_invalid_token():
    _attempts.clear()
    response = client.post("/api/v1/auth/reset-password", json={"token": "bad_token", "new_password": "NewPassword123!"})
    assert response.status_code == 400
    assert "Lien expiré ou invalide." in response.json()["detail"]

def test_reset_password_invalid_user():
    _attempts.clear()
    token = create_token("missing-user-id", "admin", "reset_password")
    response = client.post("/api/v1/auth/reset-password", json={"token": token, "new_password": "NewPassword123!"})
    assert response.status_code == 404
    assert "Utilisateur non trouvé." in response.json()["detail"]

def test_reset_password_valid():
    _attempts.clear()
    with next(get_db()) as db:
        user = db.scalar(select(User).where(User.username == "admin"))
        user_id = user.id
        old_hash = user.password_hash
        user.force_password_change = True
        db.commit()

    token = create_token(user_id, "admin", "reset_password")
    response = client.post("/api/v1/auth/reset-password", json={"token": token, "new_password": "NewPassword123!"})
    assert response.status_code == 200
    assert response.json()["message"] == "Mot de passe réinitialisé avec succès."

    # Verify password was updated
    with next(get_db()) as db:
        user = db.scalar(select(User).where(User.username == "admin"))
        assert user.force_password_change is False
        assert user.password_hash != old_hash
        
        # Revert password
        user.password_hash = old_hash
        db.commit()

