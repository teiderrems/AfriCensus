from typing import Any

from fastapi import APIRouter, Depends, Query, Response

from ...container import store
from ...dependencies import current_user
from ...schemas import HouseholdIn
from ...services import assert_zone, create_item, filter_items, set_status, soft_delete, update_item, visible, visible_item


router = APIRouter(prefix="/households", tags=["households"])


@router.get("")
def list_households(
    zone_id: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    user: dict[str, Any] = Depends(current_user),
) -> list[dict[str, Any]]:
    return filter_items(visible(store.all()["households"], user), zone_id, status_filter)


@router.post("", status_code=201)
def create_household(payload: HouseholdIn, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    assert_zone(user, payload.zone_id)
    item = payload.model_dump() | {"validation_status": "DRAFT", "sync_status": "SYNCED"}
    return create_item("households", item, user["id"], "CREATE_HOUSEHOLD")


@router.get("/{item_id}")
def get_household(item_id: str, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return visible_item("households", item_id, user)


@router.put("/{item_id}")
def update_household(item_id: str, payload: HouseholdIn, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    assert_zone(user, payload.zone_id)
    return update_item("households", item_id, payload.model_dump(), user["id"], "UPDATE_HOUSEHOLD")


@router.delete("/{item_id}", status_code=204)
def delete_household(item_id: str, user: dict[str, Any] = Depends(current_user)):
    soft_delete("households", item_id, user["id"], "DELETE_HOUSEHOLD")
    return Response(status_code=204)


@router.post("/{item_id}/submit")
def submit_household(item_id: str, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return set_status("households", item_id, "SUBMITTED", user["id"], "SUBMIT_HOUSEHOLD")
