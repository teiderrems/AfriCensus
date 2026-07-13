from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from ...container import store
from ...dependencies import current_user, require_roles
from ...schemas import PasswordUpdate, Role, UserCreate, UserOut, UserRoleUpdate, UserUpdate, now_iso
from ...security import hash_password
from ...services import audit, find_in_data, public_user


router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut], summary="Lister les utilisateurs")
def list_users(
    role: Role | None = Query(default=None, description="Filtrer par rôle."),
    active: bool | None = Query(default=None, description="Filtrer par statut actif."),
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR, Role.AUDITOR)),
) -> list[dict[str, Any]]:
    items = [item for item in store.all()["users"] if not item.get("deleted_at")]
    if user["role"] == Role.SUPERVISOR.value:
        items = [item for item in items if _shares_zone(user, item) or item["id"] == user["id"]]
    if role:
        items = [item for item in items if item["role"] == role.value]
    if active is not None:
        items = [item for item in items if item.get("active") is active]
    return [public_user(item) | {"active": item.get("active", True)} for item in items]


@router.post("", response_model=UserOut, status_code=201, summary="Créer un utilisateur")
def create_user(payload: UserCreate, user: dict[str, Any] = Depends(require_roles(Role.ADMIN))) -> dict[str, Any]:
    data = store.all()
    if any(item["username"] == payload.username and not item.get("deleted_at") for item in data["users"]):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")
    now = now_iso()
    item = {
        "id": str(uuid4()),
        "username": payload.username,
        "full_name": payload.full_name,
        "role": payload.role.value,
        "password_hash": hash_password(payload.password),
        "active": payload.active,
        "zone_ids": payload.zone_ids,
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
    }
    data["users"].append(item)
    audit(data, user["id"], "CREATE_USER", "users", item["id"])
    store.save(data)
    return public_user(item) | {"active": item["active"]}


@router.get("/me", response_model=UserOut, summary="Lire le profil courant")
def get_me(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return public_user(user) | {"active": user.get("active", True)}


@router.get("/{user_id}", response_model=UserOut, summary="Lire un utilisateur")
def get_user(user_id: str, user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR, Role.AUDITOR))) -> dict[str, Any]:
    item = _find_user_for_role(user_id, user)
    return public_user(item) | {"active": item.get("active", True)}


@router.put("/{user_id}", response_model=UserOut, summary="Modifier un utilisateur")
def update_user(user_id: str, payload: UserUpdate, user: dict[str, Any] = Depends(require_roles(Role.ADMIN))) -> dict[str, Any]:
    data = store.all()
    item = find_in_data(data, "users", user_id)
    changes = payload.model_dump(exclude_unset=True)
    if "username" in changes and any(entry["username"] == changes["username"] and entry["id"] != user_id and not entry.get("deleted_at") for entry in data["users"]):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")
    item.update(changes | {"updated_at": now_iso()})
    audit(data, user["id"], "UPDATE_USER", "users", user_id)
    store.save(data)
    return public_user(item) | {"active": item.get("active", True)}


@router.post("/{user_id}/role", response_model=UserOut, summary="Changer le rôle d’un utilisateur")
def change_user_role(user_id: str, payload: UserRoleUpdate, user: dict[str, Any] = Depends(require_roles(Role.ADMIN))) -> dict[str, Any]:
    data = store.all()
    item = find_in_data(data, "users", user_id)
    item["role"] = payload.role.value
    item["updated_at"] = now_iso()
    audit(data, user["id"], "CHANGE_USER_ROLE", "users", user_id)
    store.save(data)
    return public_user(item) | {"active": item.get("active", True)}


@router.post("/{user_id}/password", status_code=204, summary="Réinitialiser le mot de passe")
def reset_password(user_id: str, payload: PasswordUpdate, user: dict[str, Any] = Depends(require_roles(Role.ADMIN))):
    data = store.all()
    item = find_in_data(data, "users", user_id)
    item["password_hash"] = hash_password(payload.password)
    item["updated_at"] = now_iso()
    audit(data, user["id"], "RESET_USER_PASSWORD", "users", user_id)
    store.save(data)
    return Response(status_code=204)


@router.post("/{user_id}/activate", response_model=UserOut, summary="Activer un utilisateur")
def activate_user(user_id: str, user: dict[str, Any] = Depends(require_roles(Role.ADMIN))) -> dict[str, Any]:
    return _set_active(user_id, True, user)


@router.post("/{user_id}/deactivate", response_model=UserOut, summary="Désactiver un utilisateur")
def deactivate_user(user_id: str, user: dict[str, Any] = Depends(require_roles(Role.ADMIN))) -> dict[str, Any]:
    return _set_active(user_id, False, user)


@router.delete("/{user_id}", status_code=204, summary="Supprimer logiquement un utilisateur")
def delete_user(user_id: str, user: dict[str, Any] = Depends(require_roles(Role.ADMIN))):
    if user_id == user["id"]:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Current user cannot delete itself")
    data = store.all()
    item = find_in_data(data, "users", user_id)
    item["deleted_at"] = now_iso()
    item["active"] = False
    audit(data, user["id"], "DELETE_USER", "users", user_id)
    store.save(data)
    return Response(status_code=204)


def _set_active(user_id: str, active: bool, user: dict[str, Any]) -> dict[str, Any]:
    data = store.all()
    item = find_in_data(data, "users", user_id)
    item["active"] = active
    item["updated_at"] = now_iso()
    audit(data, user["id"], "ACTIVATE_USER" if active else "DEACTIVATE_USER", "users", user_id)
    store.save(data)
    return public_user(item) | {"active": item.get("active", True)}


def _find_user_for_role(user_id: str, user: dict[str, Any]) -> dict[str, Any]:
    item = next((entry for entry in store.all()["users"] if entry["id"] == user_id and not entry.get("deleted_at")), None)
    if not item:
        raise HTTPException(status_code=404, detail="users not found")
    if user["role"] == Role.SUPERVISOR.value and not _shares_zone(user, item) and item["id"] != user["id"]:
        raise HTTPException(status_code=403, detail="User not allowed")
    return item


def _shares_zone(left: dict[str, Any], right: dict[str, Any]) -> bool:
    return bool(set(left.get("zone_ids", [])) & set(right.get("zone_ids", [])))
