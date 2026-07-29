from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from ...dependencies import current_user, require_roles
from ...schemas import DecisionRequest, FamilyRelationIn, Role
from ...services import db_create_item, db_decision, inverse_relation, db_set_status, db_visible_item, db_soft_delete

router = APIRouter(prefix="/family-relations", tags=["family-relations"])
from sqlalchemy.orm import Session
from fastapi import Response
from ...database import get_db


@router.post("", status_code=201)
def create_relation(payload: FamilyRelationIn, user: dict[str, Any] = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    if payload.source_person_id == payload.target_person_id:
        raise HTTPException(status_code=422, detail="Une personne ne peut pas être liée à elle-même")
    source = db_visible_item(db, "persons", payload.source_person_id, user)
    target = db_visible_item(db, "persons", payload.target_person_id, user)

    # Validate gender-relation consistency
    src_gender = (source.get("gender") or "").upper()
    rtype = (payload.relation_type or "").upper()
    MALE_ONLY_RELATIONS = {"PERE_DE", "EPOUX_DE", "GRANDFATHER", "GRANDSON"}
    FEMALE_ONLY_RELATIONS = {"MERE_DE", "EPOUSE_DE", "GRANDMOTHER", "GRANDDAUGHTER"}
    if rtype in MALE_ONLY_RELATIONS and src_gender == "FEMALE":
        raise HTTPException(
            status_code=422,
            detail=f"La relation '{payload.relation_type}' ne peut pas être assignée à une personne de genre féminin"
        )
    if rtype in FEMALE_ONLY_RELATIONS and src_gender == "MALE":
        raise HTTPException(
            status_code=422,
            detail=f"La relation '{payload.relation_type}' ne peut pas être assignée à une personne de genre masculin"
        )
    _ = target  # already validated existence above

    item = payload.model_dump() | {"zone_id": source["zone_id"], "validation_status": "SUBMITTED", "sync_status": "SYNCED"}
    created = db_create_item(db, "family_relations", item, user["id"], "CREATE_RELATION")
    inverse = inverse_relation(created)
    if inverse:
        db_create_item(db, "family_relations", inverse, user["id"], "CREATE_INVERSE_RELATION")
    return created


@router.post("/{item_id}/validate")
def validate_relation(item_id: str, user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR)), db: Session = Depends(get_db)) -> dict[str, Any]:
    return db_set_status(db, "family_relations", item_id, "VALIDATED", user["id"], "VALIDATE_RELATION")


@router.post("/{item_id}/reject")
def reject_relation(
    item_id: str,
    payload: DecisionRequest,
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR)),
    db: Session = Depends(get_db)
) -> dict[str, Any]:
    return db_decision(db, "family_relations", item_id, "REJECTED", payload.comment, user["id"], "REJECT_RELATION")


@router.delete("/{item_id}", status_code=204)
def delete_relation(item_id: str, user: dict[str, Any] = Depends(current_user), db: Session = Depends(get_db)):
    db_visible_item(db, "family_relations", item_id, user)
    db_soft_delete(db, "family_relations", item_id, user["id"], "DELETE_RELATION")
    return Response(status_code=204)
