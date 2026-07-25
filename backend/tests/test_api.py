import hashlib
import os
import sys
from pathlib import Path
from uuid import uuid4

os.environ["DATABASE_URL"] = "sqlite:///./data/africensus_test.db"

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.security import hash_password, verify_password


client = TestClient(app)


def token() -> str:
    from app.api.routes.auth import _attempts
    _attempts.clear()
    response = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    assert response.status_code == 200, f"Token request failed: {response.status_code} {response.text}"
    return response.json()["access_token"]


def test_health():
    assert client.get("/api/v1/health").json()["status"] == "ok"


def test_frontend_root_is_served_when_build_exists():
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"


def test_password_hash_supports_pbkdf2_and_legacy_sha256():
    password = "secret123"
    modern_hash = hash_password(password)
    assert modern_hash.startswith("pbkdf2_sha256$")
    assert verify_password(password, modern_hash)
    legacy_hash = hashlib.sha256(f"africensus:{password}".encode("utf-8")).hexdigest()
    assert verify_password(password, legacy_hash)


def test_login_and_dashboard():
    access_token = token()
    response = client.get("/api/v1/dashboard/summary", headers={"Authorization": f"Bearer {access_token}"})
    assert response.status_code == 200
    assert "totalPersons" in response.json()


def test_login_rate_limit_after_repeated_failures():
    username = f"missing-{uuid4().hex}"
    last_response = None
    for _ in range(6):
        last_response = client.post("/api/v1/auth/login", json={"username": username, "password": "bad-password"})
    assert last_response is not None
    assert last_response.status_code == 429


def test_i18n_catalog_and_content_language_header():
    response = client.get("/api/v1/i18n/catalog", headers={"Accept-Language": "en-US,en;q=0.9"})
    assert response.status_code == 200
    assert response.headers["content-language"] == "en"
    payload = response.json()
    assert payload["language"] == "en"
    assert payload["catalog"]["api.summary"] == "MVP API for AfriCensus Link"


def test_i18n_field_metadata_supports_model_and_language():
    response = client.get("/api/v1/i18n/fields?model=person&lang=en")
    assert response.status_code == 200
    payload = response.json()
    assert payload["language"] == "en"
    assert payload["model"] == "person"
    assert payload["fields"]["first_name"]["label"] == "First name"
    assert payload["fields"]["household_id"]["help"] == "Attached household."


def test_home_content_public_read_and_admin_update():
    public_response = client.get("/api/v1/home-content")
    assert public_response.status_code == 200
    payload = public_response.json()
    assert payload["brand"]
    assert payload["hero"]["title"]

    access_token = token()
    headers = {"Authorization": f"Bearer {access_token}"}
    updated_payload = payload | {"brand": "AfriCensus Link Test"}
    updated_payload["hero"] = payload["hero"] | {"title": {"fr": "Accueil administrable", "en": "Editable home"}}
    update_response = client.put("/api/v1/home-content", headers=headers, json=updated_payload)
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["brand"] == "AfriCensus Link Test"
    assert updated["hero"]["title"]["fr"] == "Accueil administrable"
    localized_response = client.get("/api/v1/home-content?lang=en")
    assert localized_response.status_code == 200
    assert localized_response.json()["hero"]["title"] == "Editable home"
    raw_response = client.get("/api/v1/home-content?raw=true")
    assert raw_response.status_code == 200
    assert raw_response.json()["hero"]["title"]["en"] == "Editable home"
    restore_response = client.put("/api/v1/home-content", headers=headers, json=payload)
    assert restore_response.status_code == 200


def test_relation_cannot_self_reference():
    access_token = token()
    people = client.get("/api/v1/persons", headers={"Authorization": f"Bearer {access_token}"}).json()
    person_id = people["items"][0]["id"]
    response = client.post(
        "/api/v1/family-relations",
        headers={"Authorization": f"Bearer {access_token}"},
        json={
            "campaign_id": people["items"][0]["campaign_id"],
            "source_person_id": person_id,
            "target_person_id": person_id,
            "relation_type": "CONJOINT_DE",
        },
    )
    assert response.status_code == 422


def test_family_tree_endpoint_returns_nodes_and_links():
    access_token = token()
    people = client.get("/api/v1/persons", headers={"Authorization": f"Bearer {access_token}"}).json()
    response = client.get(f"/api/v1/persons/{people['items'][0]['id']}/family-tree?depth=2", headers={"Authorization": f"Bearer {access_token}"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["root"]["id"] == people["items"][0]["id"]
    assert payload["depth"] == 2
    assert "nodes" in payload
    assert "links" in payload


def test_family_tree_depth_zero_limits_graph_to_root():
    access_token = token()
    people = client.get("/api/v1/persons", headers={"Authorization": f"Bearer {access_token}"}).json()
    response = client.get(f"/api/v1/persons/{people['items'][0]['id']}/family-tree?depth=0", headers={"Authorization": f"Bearer {access_token}"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["depth"] == 0
    assert len(payload["nodes"]) == 1
    assert payload["nodes"][0]["id"] == people["items"][0]["id"]


def test_medical_history_create_and_family_summary():
    access_token = token()
    headers = {"Authorization": f"Bearer {access_token}"}
    people = client.get("/api/v1/persons", headers=headers).json()
    person = people["items"][0]
    created = client.post(
        "/api/v1/medical-histories",
        headers=headers,
        json={
            "person_id": person["id"],
            "campaign_id": person["campaign_id"],
            "condition_name": "Asthme familial",
            "condition_code": "J45",
            "category": "RESPIRATORY",
            "diagnosis_age": 12,
            "severity": "MODERATE",
            "status": "MONITORED",
            "hereditary_risk": True,
            "notes": "Cas déclaré pendant le test.",
        },
    )
    assert created.status_code == 201
    payload = created.json()
    assert payload["person_id"] == person["id"]
    assert payload["zone_id"] == person["zone_id"]

    summary = client.get(f"/api/v1/persons/{person['id']}/medical-family-summary?depth=2", headers=headers)
    assert summary.status_code == 200
    data = summary.json()
    assert data["root_person_id"] == person["id"]
    assert data["total_medical_records"] >= 1
    assert any(condition["condition_name"] == "Asthme familial" for condition in data["conditions"])


def test_sync_pull_returns_offline_cache_contract():
    access_token = token()
    headers = {"Authorization": f"Bearer {access_token}"}
    response = client.post("/api/v1/sync/pull", headers=headers)
    assert response.status_code == 200
    payload = response.json()
    for key in ["zones", "campaigns", "households", "persons", "family_relations", "medical_histories", "corrections", "forms"]:
        assert key in payload
        assert isinstance(payload[key], list)


def test_form_definitions_can_be_listed_and_saved():
    access_token = token()
    headers = {"Authorization": f"Bearer {access_token}"}
    listed = client.get("/api/v1/forms", headers=headers)
    assert listed.status_code == 200
    assert "items" in listed.json()

    created = client.post(
        "/api/v1/forms",
        headers=headers,
        json={
            "title": {"fr": "Questionnaire test", "en": "Test form"},
            "description": {"fr": "Brouillon", "en": "Draft"},
            "fields": [{"label": {"fr": "Nom", "en": "Name"}, "type": "short_text", "required": True}],
            "status": "DRAFT",
            "version": 1,
        },
    )
    assert created.status_code == 201
    form_id = created.json()["id"]

    updated = client.put(
        f"/api/v1/forms/{form_id}",
        headers=headers,
        json={
            "title": {"fr": "Questionnaire test modifié", "en": "Updated test form"},
            "description": {"fr": "Brouillon", "en": "Draft"},
            "fields": [{"label": {"fr": "Nom complet", "en": "Full name"}, "type": "short_text", "required": True}],
            "status": "DRAFT",
            "version": 2,
        },
    )
    assert updated.status_code == 200
    assert updated.json()["version"] == 2
    assert updated.json()["fields"][0]["label"]["fr"] == "Nom complet"


def test_users_endpoints_create_update_and_deactivate_user():
    access_token = token()
    headers = {"Authorization": f"Bearer {access_token}"}
    username = f"agent.test.{uuid4().hex[:8]}"
    created = client.post(
        "/api/v1/users",
        headers=headers,
        json={
            "username": username,
            "full_name": "Agent Test",
            "role": "AGENT",
            "password": "secret123",
            "active": True,
            "zone_ids": [],
        },
    )
    assert created.status_code == 201
    user_id = created.json()["id"]
    assert "password_hash" not in created.json()

    listed = client.get("/api/v1/users?page_size=1000", headers=headers)
    assert listed.status_code == 200
    assert any(item["id"] == user_id for item in listed.json()["items"])

    role_change = client.post(f"/api/v1/users/{user_id}/role", headers=headers, json={"role": "AUDITOR"})
    assert role_change.status_code == 200
    assert role_change.json()["role"] == "AUDITOR"

    deactivated = client.post(f"/api/v1/users/{user_id}/deactivate", headers=headers)
    assert deactivated.status_code == 200
    assert deactivated.json()["active"] is False


def test_roles_list_and_permissions():
    access_token = token()
    headers = {"Authorization": f"Bearer {access_token}"}
    roles_res = client.get("/api/v1/roles", headers=headers)
    assert roles_res.status_code == 200
    roles = roles_res.json()
    assert len(roles) >= 5
    assert any(r["name"] == "ADMIN" for r in roles)

    perms_res = client.get("/api/v1/roles/permissions/available", headers=headers)
    assert perms_res.status_code == 200
    perms = perms_res.json()
    assert len(perms) >= 1


def test_messaging_endpoints_list_send_and_react():
    access_token = token()
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # 1. Get conversations
    convs = client.get("/api/v1/messages/conversations", headers=headers)
    assert convs.status_code == 200
    conv_list = convs.json()
    assert isinstance(conv_list, list)

    # 2. Create group channel
    group_res = client.post("/api/v1/messages/groups", headers=headers, json={"name": "Canal Test Automatisé"})
    assert group_res.status_code == 200
    group_id = group_res.json()["id"]

    # 3. Send message
    msg_res = client.post("/api/v1/messages", headers=headers, json={
        "content": "Message de test fonctionnel",
        "receiver_id": group_id,
        "is_group": True
    })
    assert msg_res.status_code == 200
    msg_id = msg_res.json()["id"]

    # 4. Toggle reaction
    react_res = client.post(f"/api/v1/messages/{msg_id}/reactions", headers=headers, json={"emoji": "👍"})
    assert react_res.status_code == 200
    assert "👍" in react_res.json()["reactions"]

    # 5. Fetch messages of conversation
    msgs = client.get(f"/api/v1/messages/{group_id}", headers=headers)
    assert msgs.status_code == 200
    assert any(m["id"] == msg_id for m in msgs.json())


