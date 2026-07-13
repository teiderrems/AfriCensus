from typing import Any

from fastapi import APIRouter, Depends, Query, Response

from ...container import store
from ...dependencies import current_user, require_roles
from ...schemas import DecisionRequest, PersonIn, Role
from ...services import (
    assert_zone,
    create_item,
    decision,
    detect_duplicates,
    filter_items,
    build_family_tree,
    set_status,
    soft_delete,
    update_item,
    visible,
    visible_item,
)


router = APIRouter(prefix="/persons", tags=["persons"])


@router.get("")
def list_persons(
    zone_id: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    user: dict[str, Any] = Depends(current_user),
) -> list[dict[str, Any]]:
    return filter_items(visible(store.all()["persons"], user), zone_id, status_filter)


@router.post("", status_code=201)
def create_person(payload: PersonIn, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    assert_zone(user, payload.zone_id)
    item = payload.model_dump() | {"validation_status": "DRAFT", "sync_status": "SYNCED"}
    created = create_item("persons", item, user["id"], "CREATE_PERSON")
    detect_duplicates(created)
    return created


@router.get("/{item_id}")
def get_person(item_id: str, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return visible_item("persons", item_id, user)


@router.get("/{item_id}/family-tree")
def get_family_tree(
    item_id: str,
    depth: int = Query(default=2, ge=0, le=6, description="Profondeur d’expansion du graphe familial autour de la personne centrale."),
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    return build_family_tree(item_id, user, depth)


@router.put("/{item_id}")
def update_person(item_id: str, payload: PersonIn, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    assert_zone(user, payload.zone_id)
    return update_item("persons", item_id, payload.model_dump(), user["id"], "UPDATE_PERSON")


@router.delete("/{item_id}", status_code=204)
def delete_person(item_id: str, user: dict[str, Any] = Depends(current_user)):
    soft_delete("persons", item_id, user["id"], "DELETE_PERSON")
    return Response(status_code=204)


@router.post("/{item_id}/submit")
def submit_person(item_id: str, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return set_status("persons", item_id, "SUBMITTED", user["id"], "SUBMIT_PERSON")


@router.post("/{item_id}/validate")
def validate_person(item_id: str, user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR))) -> dict[str, Any]:
    return set_status("persons", item_id, "VALIDATED", user["id"], "VALIDATE_PERSON")


@router.post("/{item_id}/reject")
def reject_person(
    item_id: str,
    payload: DecisionRequest,
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR)),
) -> dict[str, Any]:
    return decision("persons", item_id, "REJECTED", payload.comment, user["id"], "REJECT_PERSON")


@router.post("/{item_id}/request-correction")
def request_person_correction(
    item_id: str,
    payload: DecisionRequest,
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR)),
) -> dict[str, Any]:
    return decision("persons", item_id, "NEEDS_CORRECTION", payload.comment, user["id"], "REQUEST_CORRECTION")


@router.get("/{item_id}/relations")
def list_person_relations(item_id: str, user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    visible_item("persons", item_id, user)
    return [
        relation
        for relation in store.all()["family_relations"]
        if relation["source_person_id"] == item_id or relation["target_person_id"] == item_id
    ]
