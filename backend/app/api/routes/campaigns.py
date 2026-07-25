from typing import Any

from fastapi import APIRouter, Depends, Query

from ...dependencies import current_user, require_roles, get_db
from ...schemas import CampaignIn, Role, PaginatedResponse
from ...services import db_create_item
from sqlalchemy.orm import Session
from sqlalchemy import select
from ...models import Campaign
from ...db_services import paginate_query


router = APIRouter(prefix="/campaigns", tags=["campaigns"])


@router.get("", response_model=PaginatedResponse[dict[str, Any]])
def list_campaigns(
    query: str | None = Query(default=None, alias="search"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=1000),
    sort_by: str | None = Query(default=None),
    sort_order: str = Query(default='asc'),
    db: Session = Depends(get_db)
) -> dict[str, Any]:
    q = select(Campaign)
    if query:
        search_lower = f"%{query.lower()}%"
        q = q.where(Campaign.name.ilike(search_lower))
        
    return paginate_query(db, q, page, page_size, sort_by, sort_order)


@router.post("", status_code=201)
def create_campaign(
    payload: CampaignIn, 
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR)),
    db: Session = Depends(get_db)
) -> dict[str, Any]:
    return db_create_item(db, "campaigns", payload.model_dump(), user["id"], "CREATE_CAMPAIGN")
