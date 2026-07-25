from typing import Any

from fastapi import APIRouter, Depends, Query

from ...dependencies import current_user, require_roles, get_db
from ...schemas import FormDefinitionIn, FormDefinitionOut, Role, PaginatedResponse
from ...services import db_create_item, db_update_item
from sqlalchemy.orm import Session
from sqlalchemy import select, or_
from ...models import FormDefinition
from ...db_services import paginate_query


router = APIRouter(prefix="/forms", tags=["forms"])


@router.get("", response_model=PaginatedResponse[FormDefinitionOut])
def list_forms(
    query: str | None = Query(default=None, alias="search"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=1000),
    sort_by: str | None = Query(default=None),
    sort_order: str = Query(default='asc'),
    _: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db)
) -> dict[str, Any]:
    q = select(FormDefinition).where(FormDefinition.deleted_at.is_(None))
    if query:
        search_lower = f"%{query.lower()}%"
        q = q.where(
            or_(
                FormDefinition.title.ilike(search_lower),
                FormDefinition.description.ilike(search_lower)
            )
        )
        
    return paginate_query(db, q, page, page_size, sort_by, sort_order)


@router.post("", response_model=FormDefinitionOut, status_code=201)
def create_form(
    payload: FormDefinitionIn, 
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR)),
    db: Session = Depends(get_db)
) -> dict[str, Any]:
    return db_create_item(db, "form_definitions", payload.model_dump(), user["id"], "CREATE_FORM_DEFINITION")


@router.put("/{item_id}", response_model=FormDefinitionOut)
def update_form(
    item_id: str,
    payload: FormDefinitionIn,
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR)),
    db: Session = Depends(get_db)
) -> dict[str, Any]:
    return db_update_item(db, "form_definitions", item_id, payload.model_dump(), user["id"], "UPDATE_FORM_DEFINITION")
