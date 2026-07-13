from typing import Any
import time

from fastapi import APIRouter, HTTPException, Request, status

from ...container import store
from ...config import get_settings
from ...schemas import LoginRequest, RefreshRequest
from ...security import create_token, decode_token, verify_password
from ...services import audit, find_item, public_user


router = APIRouter(prefix="/auth", tags=["auth"])
_attempts: dict[str, list[float]] = {}


@router.post("/login")
def login(payload: LoginRequest, request: Request) -> dict[str, Any]:
    _assert_not_rate_limited(_rate_key(request, payload.username))
    data = store.all()
    user = next((item for item in data["users"] if item["username"] == payload.username), None)
    if not user or not user.get("active") or not verify_password(payload.password, user["password_hash"]):
        _record_failed_attempt(_rate_key(request, payload.username))
        audit(data, None, "LOGIN_FAILED", "user", payload.username)
        store.save(data)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Identifiants invalides")
    _clear_attempts(_rate_key(request, payload.username))
    audit(data, user["id"], "LOGIN_SUCCESS", "user", user["id"])
    store.save(data)
    return {
        "access_token": create_token(user["id"], user["role"], "access"),
        "refresh_token": create_token(user["id"], user["role"], "refresh"),
        "token_type": "bearer",
        "user": public_user(user),
        "zones": [zone for zone in data["zones"] if zone["id"] in user.get("zone_ids", [])],
    }


@router.post("/refresh-token")
def refresh_token(payload: RefreshRequest, request: Request) -> dict[str, str]:
    _assert_not_rate_limited(_rate_key(request, "refresh"))
    try:
        token_data = decode_token(payload.refresh_token, "refresh")
    except ValueError as exc:
        _record_failed_attempt(_rate_key(request, "refresh"))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    user = find_item("users", token_data["sub"])
    if not user or not user.get("active"):
        _record_failed_attempt(_rate_key(request, "refresh"))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive or unknown user")
    return {"access_token": create_token(user["id"], user["role"], "access"), "token_type": "bearer"}


def _rate_key(request: Request, subject: str) -> str:
    client_host = request.client.host if request.client else "unknown"
    return f"{client_host}:{subject.lower()}"


def _assert_not_rate_limited(key: str) -> None:
    settings = get_settings()
    now = time.monotonic()
    window_start = now - settings.auth_rate_limit_window_seconds
    attempts = [item for item in _attempts.get(key, []) if item >= window_start]
    _attempts[key] = attempts
    if len(attempts) >= settings.auth_rate_limit_attempts:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Trop de tentatives. Réessayez plus tard.")


def _record_failed_attempt(key: str) -> None:
    _attempts.setdefault(key, []).append(time.monotonic())


def _clear_attempts(key: str) -> None:
    _attempts.pop(key, None)
