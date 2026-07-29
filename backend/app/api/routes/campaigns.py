from typing import Any

from fastapi import APIRouter, Depends, Query, Response, HTTPException

from ...dependencies import current_user, require_roles, get_db
from ...schemas import CampaignIn, Role, PaginatedResponse
from ...services import db_create_item, db_find_or_404, db_update_item, db_soft_delete
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
        from sqlalchemy import cast, String
        q = q.where(cast(Campaign.name, String).ilike(search_lower))
        
    return paginate_query(db, q, page, page_size, sort_by, sort_order)


@router.post("", status_code=201)
def create_campaign(
    payload: CampaignIn, 
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR)),
    db: Session = Depends(get_db)
) -> dict[str, Any]:
    return db_create_item(db, "campaigns", payload.model_dump(), user["id"], "CREATE_CAMPAIGN")


@router.get("/{campaign_id}")
def get_campaign(
    campaign_id: str,
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db)
) -> dict[str, Any]:
    return db_find_or_404(db, "campaigns", campaign_id)


@router.put("/{campaign_id}")
def update_campaign(
    campaign_id: str,
    payload: CampaignIn,
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR)),
    db: Session = Depends(get_db)
) -> dict[str, Any]:
    return db_update_item(db, "campaigns", campaign_id, payload.model_dump(), user["id"], "UPDATE_CAMPAIGN")


@router.delete("/{campaign_id}", status_code=204)
def delete_campaign(
    campaign_id: str,
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(get_db)
):
    db_soft_delete(db, "campaigns", campaign_id, user["id"], "DELETE_CAMPAIGN")
    return Response(status_code=204)
