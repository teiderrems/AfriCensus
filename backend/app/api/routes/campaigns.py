from typing import Any

from fastapi import APIRouter, Depends

from ...container import store
from ...dependencies import current_user, require_roles
from ...schemas import CampaignIn, Role
from ...services import create_item


router = APIRouter(prefix="/campaigns", tags=["campaigns"])


@router.get("")
def list_campaigns(_: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    return store.all()["campaigns"]


@router.post("", status_code=201)
def create_campaign(payload: CampaignIn, user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR))) -> dict[str, Any]:
    return create_item("campaigns", payload.model_dump(), user["id"], "CREATE_CAMPAIGN")
