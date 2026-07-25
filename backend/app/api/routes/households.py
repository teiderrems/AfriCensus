from typing import Any

from fastapi import APIRouter, Depends, Query, Response

from ...dependencies import current_user, require_roles
from ...schemas import HouseholdIn, DecisionRequest, Role, PaginatedResponse
from ...services import assert_zone, db_create_item, db_set_status, db_soft_delete, db_update_item, db_visible_item, db_decision

from ...database import get_db
from ...db_services import paginate_query, filter_query, visible_query
from ...models import Household
from sqlalchemy import select
from sqlalchemy.orm import Session

router = APIRouter(prefix="/households", tags=["households"])

@router.get("", response_model=PaginatedResponse[dict[str, Any]])
def list_households(
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
    q = select(Household)
    q = visible_query(q, Household, user)
    q = filter_query(q, Household, zone_id, status_filter, query)
    return paginate_query(db, q, page, page_size, sort_by, sort_order)


@router.post("", status_code=201)
def create_household(payload: HouseholdIn, user: dict[str, Any] = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    assert_zone(user, payload.zone_id)
    item = payload.model_dump() | {"validation_status": "DRAFT", "sync_status": "SYNCED"}
    return db_create_item(db, "households", item, user["id"], "CREATE_HOUSEHOLD")


@router.get("/{item_id}")
def get_household(item_id: str, user: dict[str, Any] = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    return db_visible_item(db, "households", item_id, user)


@router.put("/{item_id}")
def update_household(item_id: str, payload: HouseholdIn, user: dict[str, Any] = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    db_visible_item(db, "households", item_id, user)
    assert_zone(user, payload.zone_id)
    return db_update_item(db, "households", item_id, payload.model_dump(), user["id"], "UPDATE_HOUSEHOLD")


@router.delete("/{item_id}", status_code=204)
def delete_household(item_id: str, user: dict[str, Any] = Depends(current_user), db: Session = Depends(get_db)):
    db_visible_item(db, "households", item_id, user)
    db_soft_delete(db, "households", item_id, user["id"], "DELETE_HOUSEHOLD")
    return Response(status_code=204)


@router.post("/{item_id}/submit")
def submit_household(item_id: str, user: dict[str, Any] = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    db_visible_item(db, "households", item_id, user)
    return db_set_status(db, "households", item_id, "SUBMITTED", user["id"], "SUBMIT_HOUSEHOLD")


@router.post("/{item_id}/validate")
def validate_household(item_id: str, user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR)), db: Session = Depends(get_db)) -> dict[str, Any]:
    db_visible_item(db, "households", item_id, user)
    return db_set_status(db, "households", item_id, "VALIDATED", user["id"], "VALIDATE_HOUSEHOLD")


@router.post("/{item_id}/reject")
def reject_household(
    item_id: str,
    payload: DecisionRequest,
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR)),
    db: Session = Depends(get_db)
) -> dict[str, Any]:
    db_visible_item(db, "households", item_id, user)
    return db_decision(db, "households", item_id, "REJECTED", payload.comment, user["id"], "REJECT_HOUSEHOLD")


@router.post("/{item_id}/request-correction")
def request_household_correction(
    item_id: str,
    payload: DecisionRequest,
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR)),
    db: Session = Depends(get_db)
) -> dict[str, Any]:
    db_visible_item(db, "households", item_id, user)
    return db_decision(db, "households", item_id, "NEEDS_CORRECTION", payload.comment, user["id"], "REQUEST_CORRECTION_HOUSEHOLD")
