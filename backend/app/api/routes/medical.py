from typing import Any

from fastapi import APIRouter, Depends, Query

from ...dependencies import current_user, require_roles
from ...schemas import DecisionRequest, FamilyMedicalSummaryOut, MedicalHistoryIn, MedicalHistoryOut, Role, PaginatedResponse
from ...services import db_create_item, db_decision, db_family_medical_summary, db_set_status, db_visible_item

from ...database import get_db
from ...db_services import paginate_query, visible_query
from ...models import MedicalHistory
from sqlalchemy import select
from sqlalchemy.orm import Session

router = APIRouter(tags=["medical-histories"])

@router.get("/medical-histories", response_model=PaginatedResponse[MedicalHistoryOut])
def list_medical_histories(
    person_id: str | None = Query(default=None, description="Filtrer les antécédents d’une personne."),
    search: str | None = Query(default=None, description="Filtrer par nom partiel de pathologie."),
    zone_id: str | None = Query(default=None, description="Filtrer par zone géographique."),
    severity: str | None = Query(default=None, description="Filtrer par sévérité."),
    hereditary_risk: str | None = Query(default=None, description="Filtrer par risque héréditaire (hereditary/non_hereditary)."),
    page: int = Query(default=1, ge=1, description="Numéro de page."),
    page_size: int = Query(default=10, ge=1, le=100, description="Taille de page."),
    sort_by: str | None = Query(default=None, description="Field to sort by"),
    sort_order: str = Query(default="asc", description="Sort order (asc/desc)"),
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    q = select(MedicalHistory)
    q = visible_query(q, MedicalHistory, user)
    
    if person_id:
        q = q.where(MedicalHistory.person_id == person_id)
        
    if search:
        search_lower = f"%{search.lower()}%"
        q = q.where(MedicalHistory.condition_name.ilike(search_lower))
        
    if zone_id:
        q = q.where(MedicalHistory.zone_id == zone_id)
        
    if severity:
        q = q.where(MedicalHistory.severity == severity)
        
    if hereditary_risk:
        is_hereditary = hereditary_risk == 'hereditary'
        q = q.where(MedicalHistory.hereditary_risk == is_hereditary)
        
    return paginate_query(db, q, page, page_size, sort_by, sort_order)


@router.post("/medical-histories", response_model=MedicalHistoryOut, status_code=201)
def create_medical_history(payload: MedicalHistoryIn, user: dict[str, Any] = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    person = db_visible_item(db, "persons", payload.person_id, user)
    item = payload.model_dump() | {
        "zone_id": person["zone_id"],
        "validation_status": "SUBMITTED",
        "sync_status": "SYNCED",
    }
    return db_create_item(db, "medical_histories", item, user["id"], "CREATE_MEDICAL_HISTORY")


@router.post("/medical-histories/{item_id}/validate", response_model=MedicalHistoryOut)
def validate_medical_history(item_id: str, user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR)), db: Session = Depends(get_db)) -> dict[str, Any]:
    return db_set_status(db, "medical_histories", item_id, "VALIDATED", user["id"], "VALIDATE_MEDICAL_HISTORY")


@router.post("/medical-histories/{item_id}/reject", response_model=MedicalHistoryOut)
def reject_medical_history(
    item_id: str,
    payload: DecisionRequest,
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR)),
    db: Session = Depends(get_db)
) -> dict[str, Any]:
    return db_decision(db, "medical_histories", item_id, "REJECTED", payload.comment, user["id"], "REJECT_MEDICAL_HISTORY")


@router.get("/persons/{item_id}/medical-family-summary", response_model=FamilyMedicalSummaryOut)
def get_family_medical_summary(
    item_id: str,
    depth: int = Query(default=2, ge=0, le=6, description="Profondeur d’expansion familiale utilisée pour agréger les antécédents."),
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db)
) -> dict[str, Any]:
    return db_family_medical_summary(db, item_id, user, depth)
