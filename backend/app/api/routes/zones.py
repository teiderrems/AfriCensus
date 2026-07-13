from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response

from ...container import store
from ...dependencies import current_user, require_roles
from ...schemas import Role, ZoneIn
from ...services import can_see_zone, create_item, find_or_404, soft_delete, update_item


router = APIRouter(prefix="/zones", tags=["zones"])


@router.get("")
def list_zones(user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    return [zone for zone in store.all()["zones"] if can_see_zone(user, zone["id"])]


@router.post("", status_code=201)
def create_zone(payload: ZoneIn, user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR))) -> dict[str, Any]:
    return create_item("zones", payload.model_dump(), user["id"], "CREATE_ZONE")


@router.get("/{zone_id}")
def get_zone(zone_id: str, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    zone = find_or_404("zones", zone_id)
    if not can_see_zone(user, zone_id):
        raise HTTPException(status_code=403, detail="Zone not allowed")
    return zone


@router.put("/{zone_id}")
def update_zone(zone_id: str, payload: ZoneIn, user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR))) -> dict[str, Any]:
    return update_item("zones", zone_id, payload.model_dump(), user["id"], "UPDATE_ZONE")


@router.delete("/{zone_id}", status_code=204)
def delete_zone(zone_id: str, user: dict[str, Any] = Depends(require_roles(Role.ADMIN))):
    soft_delete("zones", zone_id, user["id"], "DELETE_ZONE")
    return Response(status_code=204)
