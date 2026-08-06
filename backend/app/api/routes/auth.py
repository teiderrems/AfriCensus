from typing import Any
import time
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status

from ...config import get_settings
from ...schemas import LoginRequest, RefreshRequest, ForgotPasswordRequest, ResetPasswordRequest
from ...security import create_token, decode_token, verify_password
from ...services import db_audit, public_user
from sqlalchemy.orm import Session
from sqlalchemy import select, or_
from ...database import get_db
from ...models import User
from ...models import Zone

router = APIRouter(prefix="/auth", tags=["auth"])
_attempts: dict[str, list[float]] = {}


@router.post("/login")
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> dict[str, Any]:
    _assert_not_rate_limited(_rate_key(request, payload.username))
    user = db.scalar(
        select(User).where(
            or_(
                User.username == payload.username,
                User.email == payload.username,
                User.phone == payload.username
            )
        ).where(User.active == True)
    )
    
    if not user or not user.active or not verify_password(payload.password, user.password_hash):
        _record_failed_attempt(_rate_key(request, payload.username))
        db_audit(db, None, "LOGIN_FAILED", "user", payload.username)
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Identifiants invalides")
        
    if getattr(user, "force_password_change", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="PASSWORD_EXPIRED")
        
    password_changed_at = getattr(user, "password_changed_at", None)
    if password_changed_at:
        try:
            changed_date = datetime.fromisoformat(password_changed_at.replace("Z", "+00:00"))
            if changed_date.tzinfo is None:
                changed_date = changed_date.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > (changed_date + timedelta(days=90)):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="PASSWORD_EXPIRED")
        except ValueError:
            pass
        
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


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    _assert_not_rate_limited(_rate_key(request, "forgot_password"))
    
    user = db.scalar(
        select(User).where(
            or_(
                User.username == payload.username_or_email,
                User.email == payload.username_or_email
            )
        ).where(User.active == True)
    )
    
    if not user:
        _record_failed_attempt(_rate_key(request, "forgot_password"))
        # We don't want to leak user existence, so we return 200 anyway
        return {"message": "Si l'adresse correspond à un compte, un e-mail a été envoyé."}
        
    _clear_attempts(_rate_key(request, "forgot_password"))
    
    token = create_token(user.id, user.role, "reset_password", expires_delta=900)
    
    # Use dynamic redirect URL if provided, otherwise fallback to settings
    settings = get_settings()
    base_url = payload.redirect_url or f"{settings.frontend_public_url.rstrip('/')}/reset-password"
    
    # Handle the case where the provided URL already has query parameters
    separator = "&" if "?" in base_url else "?"
    reset_link = f"{base_url}{separator}token={token}"
    
    from ...email_service import send_reset_password_email
    await send_reset_password_email(user.email, user.full_name, reset_link, payload.sender_email, language=getattr(user, "preferred_language", "fr"))
    
    return {"message": "Si l'adresse correspond à un compte, un e-mail a été envoyé."}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    _assert_not_rate_limited(_rate_key(request, "reset_password"))
    
    try:
        token_data = decode_token(payload.token, "reset_password")
    except ValueError:
        _record_failed_attempt(_rate_key(request, "reset_password"))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lien expiré ou invalide.")
        
    user_id = token_data.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lien invalide.")
        
    user = db.scalar(select(User).where(User.id == user_id).where(User.active == True))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé.")
        
    from ...security import hash_password
    user.password_hash = hash_password(payload.new_password)
    user.password_changed_at = datetime.now(timezone.utc).isoformat()
    user.force_password_change = False
    db.commit()
    
    _clear_attempts(_rate_key(request, "reset_password"))
    return {"message": "Mot de passe réinitialisé avec succès."}
