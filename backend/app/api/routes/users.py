from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select, String, or_
from sqlalchemy.orm import Session

from ...database import get_db
from ...db_services import paginate_query
from ...dependencies import current_user, require_roles
from ...models import User
from ...schemas import PasswordUpdate, Role, UserCreate, UserOut, UserRoleUpdate, UserUpdate, now_iso, PaginatedResponse, AdminPasswordReset
from ...security import hash_password, verify_password
from ...services import db_audit, public_user, db_find_or_404


router = APIRouter(prefix="/users", tags=["users"])



@router.get("", response_model=PaginatedResponse[UserOut], summary="Lister les utilisateurs")
def list_users(
    role: Role | None = Query(default=None, description="Filtrer par rôle."),
    active: bool | None = Query(default=None, description="Filtrer par statut actif."),
    query: str | None = Query(default=None, alias="search"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=1000),
    sort_by: str | None = Query(default=None),
    sort_order: str = Query(default='asc'),
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR, Role.AUDITOR)),
    db: Session = Depends(get_db),
) -> Any:
    q = select(User)
    
    if user["role"] == Role.SUPERVISOR.value:
        zone_conditions = [User.zone_ids.cast(String).ilike(f'%"{z}"%') for z in user.get("zone_ids", [])]
        if zone_conditions:
            q = q.where(or_(User.id == user["id"], *zone_conditions))
        else:
            q = q.where(User.id == user["id"])
            
    if role:
        q = q.where(User.role == role.value)
    if active is not None:
        q = q.where(User.active == active)
    if query:
        search_lower = f"%{query.lower()}%"
        q = q.where(or_(
            User.username.ilike(search_lower),
            User.full_name.ilike(search_lower)
        ))
        
    # the frontend expects the format of public_user
    # so we will use the raw dicts from paginate_query and filter the fields out.
    paginated = paginate_query(db, q, page, page_size, sort_by, sort_order)
    paginated["items"] = [public_user(item) | {"active": item.get("active", True)} for item in paginated["items"]]
    return paginated


@router.post("", response_model=UserOut, status_code=201, summary="Créer un utilisateur")
def create_user(payload: UserCreate, user: dict[str, Any] = Depends(require_roles(Role.ADMIN)), db: Session = Depends(get_db)) -> dict[str, Any]:
    existing_username = db.scalar(select(User).where(User.username == payload.username))
    if existing_username:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")
    
    if payload.email:
        existing_email = db.scalar(select(User).where(User.email == payload.email))
        if existing_email:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
            
    if payload.phone:
        existing_phone = db.scalar(select(User).where(User.phone == payload.phone))
        if existing_phone:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone already exists")
    
    now = now_iso()
    new_user = User(
        id=str(uuid4()),
        username=payload.username,
        email=payload.email,
        phone=payload.phone,
        full_name=payload.full_name,
        role=payload.role.value,
        password_hash=hash_password(payload.password),
        active=payload.active,
        zone_ids=payload.zone_ids,
    )
    db.add(new_user)
    db_audit(db, user["id"], "CREATE_USER", "users", new_user.id)
    db.commit()
    db.refresh(new_user)
    return public_user(new_user.to_dict()) | {"active": new_user.active}


@router.get("/me", response_model=UserOut, summary="Lire le profil courant")
def get_me(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return public_user(user) | {"active": user.get("active", True), "preferred_language": user.get("preferred_language", "fr")}

@router.patch("/me", response_model=UserOut, summary="Mettre à jour son propre profil")
def update_me(payload: UserUpdate, user: dict[str, Any] = Depends(current_user), db: Session = Depends(get_db)):
    db_user = db.scalar(select(User).where(User.id == user["id"]))
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if payload.preferred_language is not None:
        db_user.preferred_language = payload.preferred_language
        
    db_audit(db, user["id"], "UPDATE_OWN_PROFILE", "users", user["id"])
    db.commit()
    db.refresh(db_user)
    return public_user(db_user.to_dict()) | {"active": db_user.active, "preferred_language": db_user.preferred_language}

@router.post("/me/password", status_code=204, summary="Mettre à jour son propre mot de passe")
def update_my_password(payload: PasswordUpdate, user: dict[str, Any] = Depends(current_user), db: Session = Depends(get_db)):
    db_user = db.scalar(select(User).where(User.id == user["id"]))
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not verify_password(payload.old_password, db_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid old password")
        
    db_user.password_hash = hash_password(payload.password)
    db_user.force_password_change = False
    db_user.password_changed_at = now_iso()
    
    db_audit(db, user["id"], "UPDATE_OWN_PASSWORD", "users", user["id"])
    db.commit()
    return Response(status_code=204)


@router.get("/{user_id}", response_model=UserOut, summary="Lire un utilisateur")
def get_user(user_id: str, user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR, Role.AUDITOR)), db: Session = Depends(get_db)) -> dict[str, Any]:
    item = _find_user_for_role(user_id, user, db)
    return public_user(item) | {"active": item.get("active", True)}


@router.put("/{user_id}", response_model=UserOut, summary="Modifier un utilisateur")
def update_user(user_id: str, payload: UserUpdate, user: dict[str, Any] = Depends(require_roles(Role.ADMIN)), db: Session = Depends(get_db)) -> dict[str, Any]:
    db_user = db.scalar(select(User).where(User.id == user_id))
    if not db_user:
        raise HTTPException(status_code=404, detail="users not found")
        
    changes = payload.model_dump(exclude_unset=True)
    if "username" in changes and changes["username"] is not None:
        existing_username = db.scalar(select(User).where(User.username == changes["username"]).where(User.id != user_id))
        if existing_username:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")
            
    if "email" in changes and changes["email"] is not None:
        existing_email = db.scalar(select(User).where(User.email == changes["email"]).where(User.id != user_id))
        if existing_email:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
            
    if "phone" in changes and changes["phone"] is not None:
        existing_phone = db.scalar(select(User).where(User.phone == changes["phone"]).where(User.id != user_id))
        if existing_phone:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone already exists")
            
    for key, value in changes.items():
        setattr(db_user, key, value)
    
    db_audit(db, user["id"], "UPDATE_USER", "users", user_id)
    db.commit()
    db.refresh(db_user)
    return public_user(db_user.to_dict()) | {"active": db_user.active}


@router.post("/{user_id}/role", response_model=UserOut, summary="Changer le rôle d’un utilisateur")
def change_user_role(user_id: str, payload: UserRoleUpdate, user: dict[str, Any] = Depends(require_roles(Role.ADMIN)), db: Session = Depends(get_db)) -> dict[str, Any]:
    db_user = db.scalar(select(User).where(User.id == user_id))
    if not db_user:
        raise HTTPException(status_code=404, detail="users not found")
    db_user.role = payload.role.value
    db_audit(db, user["id"], "CHANGE_USER_ROLE", "users", user_id)
    db.commit()
    db.refresh(db_user)
    return public_user(db_user.to_dict()) | {"active": db_user.active}


@router.post("/{user_id}/password", status_code=204, summary="Réinitialiser le mot de passe")
def reset_password(user_id: str, payload: AdminPasswordReset, user: dict[str, Any] = Depends(require_roles(Role.ADMIN)), db: Session = Depends(get_db)):
    db_user = db.scalar(select(User).where(User.id == user_id))
    if not db_user:
        raise HTTPException(status_code=404, detail="users not found")
    db_user.password_hash = hash_password(payload.password)
    db_audit(db, user["id"], "RESET_USER_PASSWORD", "users", user_id)
    db.commit()
    return Response(status_code=204)


@router.post("/{user_id}/activate", response_model=UserOut, summary="Activer un utilisateur")
def activate_user(user_id: str, user: dict[str, Any] = Depends(require_roles(Role.ADMIN)), db: Session = Depends(get_db)) -> dict[str, Any]:
    return _set_active(user_id, True, user, db)


@router.post("/{user_id}/deactivate", response_model=UserOut, summary="Désactiver un utilisateur")
def deactivate_user(user_id: str, user: dict[str, Any] = Depends(require_roles(Role.ADMIN)), db: Session = Depends(get_db)) -> dict[str, Any]:
    return _set_active(user_id, False, user, db)


@router.delete("/{user_id}", status_code=204, summary="Supprimer logiquement un utilisateur")
def delete_user(user_id: str, user: dict[str, Any] = Depends(require_roles(Role.ADMIN)), db: Session = Depends(get_db)):
    if user_id == user["id"]:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Current user cannot delete itself")
    db_user = db.scalar(select(User).where(User.id == user_id))
    if not db_user:
        raise HTTPException(status_code=404, detail="users not found")
    db_user.active = False
    db_audit(db, user["id"], "DELETE_USER", "users", user_id)
    db.commit()
    return Response(status_code=204)


def _set_active(user_id: str, active: bool, user: dict[str, Any], db: Session) -> dict[str, Any]:
    db_user = db.scalar(select(User).where(User.id == user_id))
    if not db_user:
        raise HTTPException(status_code=404, detail="users not found")
    db_user.active = active
    db_audit(db, user["id"], "ACTIVATE_USER" if active else "DEACTIVATE_USER", "users", user_id)
    db.commit()
    db.refresh(db_user)
    return public_user(db_user.to_dict()) | {"active": db_user.active}


def _find_user_for_role(user_id: str, user: dict[str, Any], db: Session) -> dict[str, Any]:
    item = db_find_or_404(db, "users", user_id)
    if user["role"] == Role.SUPERVISOR.value and not _shares_zone(user, item) and item["id"] != user["id"]:
        raise HTTPException(status_code=403, detail="User not allowed")
    return item


def _shares_zone(left: dict[str, Any], right: dict[str, Any]) -> bool:
    return bool(set(left.get("zone_ids", [])) & set(right.get("zone_ids", [])))
