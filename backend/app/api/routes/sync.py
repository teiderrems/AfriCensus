from typing import Any

from fastapi import APIRouter, Depends

from sqlalchemy.orm import Session
from sqlalchemy import select, or_
from ...database import get_db
from ...models import Zone, Campaign, Household, Person, FamilyRelation, MedicalHistory, FormDefinition
from ...db_services import visible_query
from ...dependencies import current_user
from ...schemas import (
    FamilyRelationIn,
    HouseholdIn,
    MedicalHistoryIn,
    PersonIn,
    SyncPullResponse,
    SyncPushRequest,
    SyncPushResponse,
)
from ...services import can_see_zone, db_create_item, db_visible_item


router = APIRouter(prefix="/sync", tags=["sync"])


@router.post(
    "/push",
    response_model=SyncPushResponse,
    summary="Envoyer les changements collectés hors ligne",
    description="Synchronise les créations locales de ménages, personnes, relations familiales et antécédents médicaux avec la base centrale.",
)
def sync_push(payload: SyncPushRequest, user: dict[str, Any] = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    handlers = {
        "household": (HouseholdIn, "households"),
        "person": (PersonIn, "persons"),
        "family_relation": (FamilyRelationIn, "family_relations"),
        "medical_history": (MedicalHistoryIn, "medical_histories"),
    }
    results = []
    for sync_item in payload.items:
        try:
            schema, collection = handlers[sync_item.entity_type]
            parsed = schema(**sync_item.payload)
            extra = {}
            if sync_item.entity_type == "medical_history":
                person = db_visible_item(db, "persons", parsed.person_id, user)
                extra["zone_id"] = person["zone_id"]
            created = db_create_item(
                db,
                collection,
                parsed.model_dump() | extra | {"validation_status": "SUBMITTED", "sync_status": "SYNCED"},
                user["id"],
                f"SYNC_{sync_item.entity_type.upper()}",
            )
            results.append({"local_entity_id": sync_item.local_entity_id, "server_id": created["id"], "status": "SYNCED"})
        except Exception as exc:
            results.append({"local_entity_id": sync_item.local_entity_id, "status": "ERROR", "error": str(exc)})
    return {"results": results}


@router.post(
    "/pull",
    response_model=SyncPullResponse,
    summary="Télécharger les données disponibles pour le mode hors ligne",
    description="Retourne les référentiels et les entités visibles par l’utilisateur pour alimenter le cache local après connexion ou reconnexion.",
)
def sync_pull(user: dict[str, Any] = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    visible_households = [h.to_dict() for h in db.scalars(visible_query(select(Household), Household, user).where(Household.deleted_at.is_(None))).all()]
    visible_persons = [p.to_dict() for p in db.scalars(visible_query(select(Person), Person, user).where(Person.deleted_at.is_(None))).all()]
    visible_person_ids = {person["id"] for person in visible_persons}
    
    zones = [z.to_dict() for z in db.scalars(visible_query(select(Zone), Zone, user).where(Zone.deleted_at.is_(None))).all()]
    campaigns = [c.to_dict() for c in db.scalars(select(Campaign).where(Campaign.deleted_at.is_(None))).all()]
    
    # Query relations where either source or target is in visible_person_ids
    relations = []
    if visible_person_ids:
        relations_query = select(FamilyRelation).where(
            FamilyRelation.deleted_at.is_(None),
            or_(
                FamilyRelation.source_person_id.in_(visible_person_ids),
                FamilyRelation.target_person_id.in_(visible_person_ids)
            )
        )
        relations = [r.to_dict() for r in db.scalars(relations_query).all()]
        
    medical_histories = [m.to_dict() for m in db.scalars(visible_query(select(MedicalHistory), MedicalHistory, user).where(MedicalHistory.deleted_at.is_(None))).all()]
    forms = [f.to_dict() for f in db.scalars(select(FormDefinition).where(FormDefinition.deleted_at.is_(None))).all()]
    
    return {
        "zones": zones,
        "campaigns": campaigns,
        "households": visible_households,
        "persons": visible_persons,
        "family_relations": relations,
        "medical_histories": medical_histories,
        "corrections": [item for item in visible_persons + visible_households if item.get("validation_status") == "NEEDS_CORRECTION"],
        "forms": forms,
    }
