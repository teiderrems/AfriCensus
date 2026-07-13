from typing import Any

from fastapi import APIRouter, Depends, Query

from ...container import store
from ...dependencies import current_user, require_roles
from ...schemas import DecisionRequest, FamilyMedicalSummaryOut, MedicalHistoryIn, MedicalHistoryOut, Role
from ...services import create_item, decision, family_medical_summary, filter_items, set_status, visible, visible_item


router = APIRouter(tags=["medical-histories"])


@router.get("/medical-histories", response_model=list[MedicalHistoryOut])
def list_medical_histories(
    person_id: str | None = Query(default=None, description="Filtrer les antécédents d’une personne."),
    condition: str | None = Query(default=None, description="Filtrer par nom partiel de pathologie."),
    zone_id: str | None = Query(default=None, description="Filtrer par zone géographique."),
    user: dict[str, Any] = Depends(current_user),
) -> list[dict[str, Any]]:
    histories = filter_items(visible(store.all()["medical_histories"], user), zone_id, None)
    if person_id:
        histories = [history for history in histories if history["person_id"] == person_id]
    if condition:
        condition_lower = condition.lower()
        histories = [history for history in histories if condition_lower in history["condition_name"].lower()]
    return histories


@router.post("/medical-histories", response_model=MedicalHistoryOut, status_code=201)
def create_medical_history(payload: MedicalHistoryIn, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    person = visible_item("persons", payload.person_id, user)
    item = payload.model_dump() | {
        "zone_id": person["zone_id"],
        "validation_status": "SUBMITTED",
        "sync_status": "SYNCED",
    }
    return create_item("medical_histories", item, user["id"], "CREATE_MEDICAL_HISTORY")


@router.post("/medical-histories/{item_id}/validate", response_model=MedicalHistoryOut)
def validate_medical_history(item_id: str, user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR))) -> dict[str, Any]:
    return set_status("medical_histories", item_id, "VALIDATED", user["id"], "VALIDATE_MEDICAL_HISTORY")


@router.post("/medical-histories/{item_id}/reject", response_model=MedicalHistoryOut)
def reject_medical_history(
    item_id: str,
    payload: DecisionRequest,
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR)),
) -> dict[str, Any]:
    return decision("medical_histories", item_id, "REJECTED", payload.comment, user["id"], "REJECT_MEDICAL_HISTORY")


@router.get("/persons/{item_id}/medical-family-summary", response_model=FamilyMedicalSummaryOut)
def get_family_medical_summary(
    item_id: str,
    depth: int = Query(default=2, ge=0, le=6, description="Profondeur d’expansion familiale utilisée pour agréger les antécédents."),
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    return family_medical_summary(item_id, user, depth)
