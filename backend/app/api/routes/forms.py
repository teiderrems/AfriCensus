from typing import Any

from fastapi import APIRouter, Depends

from ...container import store
from ...dependencies import current_user, require_roles
from ...schemas import FormDefinitionIn, FormDefinitionOut, Role
from ...services import create_item, update_item


router = APIRouter(prefix="/forms", tags=["forms"])


@router.get("", response_model=list[FormDefinitionOut])
def list_forms(_: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    return [item for item in store.all()["form_definitions"] if not item.get("deleted_at")]


@router.post("", response_model=FormDefinitionOut, status_code=201)
def create_form(payload: FormDefinitionIn, user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR))) -> dict[str, Any]:
    return create_item("form_definitions", payload.model_dump(), user["id"], "CREATE_FORM_DEFINITION")


@router.put("/{item_id}", response_model=FormDefinitionOut)
def update_form(
    item_id: str,
    payload: FormDefinitionIn,
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR)),
) -> dict[str, Any]:
    return update_item("form_definitions", item_id, payload.model_dump(), user["id"], "UPDATE_FORM_DEFINITION")
