from typing import Any
import time

from fastapi import APIRouter, Depends, HTTPException, Request, status

from ...config import get_settings
from ...schemas import LoginRequest, RefreshRequest
from ...security import create_token, decode_token, verify_password
from ...services import db_audit, public_user
from sqlalchemy.orm import Session
from sqlalchemy import select
from ...database import get_db
from ...models import User


router = APIRouter(prefix="/auth", tags=["auth"])
_attempts: dict[str, list[float]] = {}


from ...models import Zone
@router.post("/login")
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> dict[str, Any]:
    _assert_not_rate_limited(_rate_key(request, payload.username))
    user = db.scalar(select(User).where(User.username == payload.username).where(User.active == True))
    
    if not user or not user.active or not verify_password(payload.password, user.password_hash):
        _record_failed_attempt(_rate_key(request, payload.username))
        db_audit(db, None, "LOGIN_FAILED", "user", payload.username)
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Identifiants invalides")
        
    _clear_attempts(_rate_key(request, payload.username))
    db_audit(db, user.id, "LOGIN_SUCCESS", "user", user.id)
    db.commit()
    
    # fetch zones
    user_zone_ids = user.zone_ids or []
    zones = []
    if user_zone_ids:
        zones = db.scalars(select(Zone).where(Zone.id.in_(user_zone_ids)).where(Zone.deleted_at.is_(None))).all()
        zones = [z.to_dict() for z in zones]
        
    return {
        "access_token": create_token(user.id, user.role, "access"),
        "refresh_token": create_token(user.id, user.role, "refresh"),
        "token_type": "bearer",
        "user": public_user(user.to_dict()),
        "zones": zones,
    }


@router.post("/refresh-token")
def refresh_token(payload: RefreshRequest, request: Request, db: Session = Depends(get_db)) -> dict[str, str]:
    _assert_not_rate_limited(_rate_key(request, "refresh"))
    try:
        token_data = decode_token(payload.refresh_token, "refresh")
    except ValueError as exc:
        _record_failed_attempt(_rate_key(request, "refresh"))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
        
    from ...services import db_find_or_404
    try:
        user = db_find_or_404(db, "users", token_data["sub"])
    except HTTPException:
        user = None
        
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
