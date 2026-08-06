from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, Query

from ...dependencies import current_user, require_roles, get_db
from ...schemas import Role, ZoneIn, PaginatedResponse
from ...services import can_see_zone, db_create_item, db_find_or_404, db_soft_delete, db_update_item
from sqlalchemy.orm import Session
from sqlalchemy import select
from ...models import Zone
from ...db_services import paginate_query, visible_query


router = APIRouter(prefix="/zones", tags=["zones"])


@router.get("", response_model=PaginatedResponse[dict[str, Any]])
def list_zones(
    query: str | None = Query(default=None, alias="search"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=1000),
    sort_by: str | None = Query(default=None),
    sort_order: str = Query(default='asc'),
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db)
) -> dict[str, Any]:
    q = select(Zone)
    q = visible_query(q, Zone, user)
    if query:
        search_lower = f"%{query.lower()}%"
        from sqlalchemy import cast, String
        q = q.where(cast(Zone.name, String).ilike(search_lower))
        
    return paginate_query(db, q, page, page_size, sort_by, sort_order)


@router.post("", status_code=201)
def create_zone(
    payload: ZoneIn, 
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR)),
    db: Session = Depends(get_db)
) -> dict[str, Any]:
    if db.scalars(select(Zone).where(Zone.code == payload.code)).first():
        raise HTTPException(status_code=409, detail=f"Une zone avec le code {payload.code} existe déjà.")
    return db_create_item(db, "zones", payload.model_dump(), user["id"], "CREATE_ZONE")


@router.get("/{zone_id}")
def get_zone(
    zone_id: str, 
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db)
) -> dict[str, Any]:
    zone = db_find_or_404(db, "zones", zone_id)
    if not can_see_zone(user, zone_id):
        raise HTTPException(status_code=403, detail="Zone not allowed")
    return zone


@router.put("/{zone_id}")
def update_zone(
    zone_id: str, 
    payload: ZoneIn, 
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR)),
    db: Session = Depends(get_db)
) -> dict[str, Any]:
    existing = db.scalars(select(Zone).where(Zone.code == payload.code, Zone.id != zone_id)).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Une zone avec le code {payload.code} existe déjà.")
    return db_update_item(db, "zones", zone_id, payload.model_dump(), user["id"], "UPDATE_ZONE")


@router.delete("/{zone_id}", status_code=204)
def delete_zone(
    zone_id: str, 
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(get_db)
):
    db_soft_delete(db, "zones", zone_id, user["id"], "DELETE_ZONE")
    return Response(status_code=204)
