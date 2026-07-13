from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from ...dependencies import current_user, require_roles
from ...schemas import DecisionRequest, FamilyRelationIn, Role
from ...services import create_item, decision, inverse_relation, set_status, visible_item


router = APIRouter(prefix="/family-relations", tags=["family-relations"])


@router.post("", status_code=201)
def create_relation(payload: FamilyRelationIn, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    if payload.source_person_id == payload.target_person_id:
        raise HTTPException(status_code=422, detail="Une personne ne peut pas être liée à elle-même")
    source = visible_item("persons", payload.source_person_id, user)
    visible_item("persons", payload.target_person_id, user)
    item = payload.model_dump() | {"zone_id": source["zone_id"], "validation_status": "SUBMITTED", "sync_status": "SYNCED"}
    created = create_item("family_relations", item, user["id"], "CREATE_RELATION")
    inverse = inverse_relation(created)
    if inverse:
        create_item("family_relations", inverse, user["id"], "CREATE_INVERSE_RELATION")
    return created


@router.post("/{item_id}/validate")
def validate_relation(item_id: str, user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR))) -> dict[str, Any]:
    return set_status("family_relations", item_id, "VALIDATED", user["id"], "VALIDATE_RELATION")


@router.post("/{item_id}/reject")
def reject_relation(
    item_id: str,
    payload: DecisionRequest,
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR)),
) -> dict[str, Any]:
    return decision("family_relations", item_id, "REJECTED", payload.comment, user["id"], "REJECT_RELATION")
