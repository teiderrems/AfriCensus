from typing import Any

from fastapi import APIRouter, Depends, Query, Response

from ...dependencies import current_user, require_roles
from ...schemas import DecisionRequest, PersonIn, Role, PaginatedResponse
from ...services import (
    db_create_item,
    db_update_item,
    db_soft_delete,
    db_visible_item,
    db_decision,
    db_set_status,
    db_build_family_tree,
    assert_zone,
)


router = APIRouter(prefix="/persons", tags=["persons"])


from ...database import get_db
from ...db_services import paginate_query, filter_query, visible_query
from ...models import Person
from sqlalchemy import select
from sqlalchemy.orm import Session

@router.get("", response_model=PaginatedResponse[dict[str, Any]])
def list_persons(
    zone_id: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    query: str | None = Query(default=None, alias="search"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=1000),
    sort_by: str | None = Query(default=None),
    sort_order: str = Query(default='asc'),
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> Any:
    q = select(Person)
    q = visible_query(q, Person, user)
    q = filter_query(q, Person, zone_id, status_filter, query)
    return paginate_query(db, q, page, page_size, sort_by, sort_order)


@router.post("", status_code=201)
def create_person(payload: PersonIn, user: dict[str, Any] = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    assert_zone(user, payload.zone_id)
    item = payload.model_dump() | {"validation_status": "DRAFT", "sync_status": "SYNCED"}
    created = db_create_item(db, "persons", item, user["id"], "CREATE_PERSON")
    return created


@router.get("/{item_id}")
def get_person(item_id: str, user: dict[str, Any] = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    return db_visible_item(db, "persons", item_id, user)


@router.get("/{item_id}/family-tree")
def get_family_tree(
    item_id: str,
    depth: int = Query(default=2, ge=0, le=10, description="Profondeur d’expansion du graphe familial autour de la personne centrale."),
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db)
) -> dict[str, Any]:
    return db_build_family_tree(db, item_id, user, depth)


@router.put("/{item_id}")
def update_person(item_id: str, payload: PersonIn, user: dict[str, Any] = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    db_visible_item(db, "persons", item_id, user)
    assert_zone(user, payload.zone_id)
    return db_update_item(db, "persons", item_id, payload.model_dump(), user["id"], "UPDATE_PERSON")


@router.delete("/{item_id}", status_code=204)
def delete_person(item_id: str, user: dict[str, Any] = Depends(current_user), db: Session = Depends(get_db)):
    db_visible_item(db, "persons", item_id, user)
    db_soft_delete(db, "persons", item_id, user["id"], "DELETE_PERSON")
    return Response(status_code=204)


@router.post("/{item_id}/submit")
def submit_person(item_id: str, user: dict[str, Any] = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    db_visible_item(db, "persons", item_id, user)
    return db_set_status(db, "persons", item_id, "SUBMITTED", user["id"], "SUBMIT_PERSON")


@router.post("/{item_id}/validate")
def validate_person(item_id: str, user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR)), db: Session = Depends(get_db)) -> dict[str, Any]:
    db_visible_item(db, "persons", item_id, user)
    return db_set_status(db, "persons", item_id, "VALIDATED", user["id"], "VALIDATE_PERSON")


@router.post("/{item_id}/reject")
def reject_person(
    item_id: str,
    payload: DecisionRequest,
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR)),
    db: Session = Depends(get_db)
) -> dict[str, Any]:
    db_visible_item(db, "persons", item_id, user)
    return db_decision(db, "persons", item_id, "REJECTED", payload.comment, user["id"], "REJECT_PERSON")


@router.post("/{item_id}/request-correction")
def request_person_correction(
    item_id: str,
    payload: DecisionRequest,
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR)),
    db: Session = Depends(get_db)
) -> dict[str, Any]:
    db_visible_item(db, "persons", item_id, user)
    return db_decision(db, "persons", item_id, "NEEDS_CORRECTION", payload.comment, user["id"], "REQUEST_CORRECTION")


@router.get("/{person_id}/duplicates", summary="Trouver des doublons potentiels")
def get_duplicates(person_id: str, user: dict[str, Any] = Depends(current_user), db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    from ...models import DuplicateCandidate, Person
    from sqlalchemy import or_
    candidates = db.query(DuplicateCandidate).filter(
        or_(DuplicateCandidate.person_a_id == person_id, DuplicateCandidate.person_b_id == person_id)
    ).all()
    results = []
    for c in candidates:
        other_id = c.person_b_id if c.person_a_id == person_id else c.person_a_id
        other_person = db.query(Person).filter(Person.id == other_id).first()
        results.append({
            "id": c.id,
            "score": c.score,
            "status": c.status,
            "person": other_person.to_dict() if other_person else None
        })
    return results


from ...models import FamilyRelation
from sqlalchemy import or_

@router.get("/{item_id}/relations")
def list_person_relations(item_id: str, user: dict[str, Any] = Depends(current_user), db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    db_visible_item(db, "persons", item_id, user)
    relations = db.scalars(select(FamilyRelation).where(
        or_(FamilyRelation.source_person_id == item_id, FamilyRelation.target_person_id == item_id),
        FamilyRelation.deleted_at.is_(None)
    )).all()
    return [r.to_dict() for r in relations]
