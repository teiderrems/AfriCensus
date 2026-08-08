from typing import Any, Generator

from fastapi import Depends, HTTPException, status, Query, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .schemas import Role
from .security import decode_token
from .database import get_db


bearer_scheme = HTTPBearer(
    scheme_name="JWT Bearer",
    description="Renseignez uniquement le token JWT retourné par `/api/v1/auth/login`.",
    auto_error=False,
)


def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> Any:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    try:
        payload = decode_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    from .models import User
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user or not user.active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive or unknown user")
    return user.to_dict()


async def get_current_user_ws(token: str) -> Any:
    try:
        payload = decode_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))
    
    from .database import SessionLocal
    from .models import User
    with SessionLocal() as db:
        user = db.query(User).filter(User.id == payload["sub"]).first()
        if not user or not user.active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive or unknown user")
        return user.to_dict()


def require_roles(*roles_args):
    # Flatten the arguments in case a list is passed (e.g. ["ADMIN", "SUPERVISOR"])
    allowed_roles = set()
    for r in roles_args:
        if isinstance(r, list):
            for item in r:
                allowed_roles.add(item.value if hasattr(item, "value") else item)
        else:
            allowed_roles.add(r.value if hasattr(r, "value") else r)

    def dependency(user: Any = Depends(current_user)) -> Any:
        user_role = user.get("role") if isinstance(user, dict) else getattr(user, "role", None)
        if hasattr(user_role, "value"):
            user_role = user_role.value
        if user_role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return dependency


FEATURE_PERMISSION_MAP = {
    'messaging': 'messaging:access',
    'family_tree': 'family_tree:access',
    'medical_history': 'medical:read',
    'custom_forms': 'forms:access',
    'birth_declaration': 'birth_declaration:access',
    'duplicates': 'duplicates:manage',
    'audit': 'audit:read',
}


def require_feature(feature_key: str):
    """Dependency that raises 403 if the given feature flag is disabled globally or not permitted for the user's role."""
    def dependency(user: Any = Depends(current_user), db: Session = Depends(get_db)) -> None:
        from .models import SystemSetting
        row = db.query(SystemSetting).filter(SystemSetting.key == "app.features").first()
        if row and not row.value_json.get(feature_key, True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Feature '{feature_key}' is disabled by the administrator.",
            )
        if isinstance(user, dict):
            user_role_name = user.get("role")
            if user_role_name and user_role_name != "ADMIN":
                required_perm = FEATURE_PERMISSION_MAP.get(feature_key)
                if required_perm:
                    from .models import AppRole
                    app_role = db.query(AppRole).filter(AppRole.name == user_role_name).first()
                    if app_role and app_role.permissions is not None:
                        if required_perm not in app_role.permissions:
                            raise HTTPException(
                                status_code=status.HTTP_403_FORBIDDEN,
                                detail=f"Permission '{required_perm}' for feature '{feature_key}' is not granted for role '{user_role_name}'.",
                            )
    return dependency
