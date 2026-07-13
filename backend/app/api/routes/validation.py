from typing import Any

from fastapi import APIRouter, Depends

from ...container import store
from ...dependencies import require_roles
from ...schemas import Role
from ...services import visible


router = APIRouter(prefix="/validation-queue", tags=["validation"])


@router.get("")
def validation_queue(user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR, Role.AUDITOR))) -> list[dict[str, Any]]:
    data = store.all()
    items = []
    for entity_type in ("households", "persons", "family_relations"):
        for item in visible(data[entity_type], user):
            if item.get("validation_status") in {"SUBMITTED", "NEEDS_CORRECTION"}:
                items.append(item | {"entity_type": entity_type})
    return sorted(items, key=lambda item: item.get("updated_at", ""), reverse=True)
