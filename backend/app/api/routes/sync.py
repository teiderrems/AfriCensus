from typing import Any

from fastapi import APIRouter, Depends

from ...container import store
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
from ...services import can_see_zone, create_item, visible, visible_item


router = APIRouter(prefix="/sync", tags=["sync"])


@router.post(
    "/push",
    response_model=SyncPushResponse,
    summary="Envoyer les changements collectés hors ligne",
    description="Synchronise les créations locales de ménages, personnes, relations familiales et antécédents médicaux avec la base centrale.",
)
def sync_push(payload: SyncPushRequest, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
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
                person = visible_item("persons", parsed.person_id, user)
                extra["zone_id"] = person["zone_id"]
            created = create_item(
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
def sync_pull(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    data = store.all()
    visible_households = visible(data["households"], user)
    visible_persons = visible(data["persons"], user)
    visible_person_ids = {person["id"] for person in visible_persons}
    return {
        "zones": [zone for zone in data["zones"] if can_see_zone(user, zone["id"])],
        "campaigns": data["campaigns"],
        "households": visible_households,
        "persons": visible_persons,
        "family_relations": [
            relation
            for relation in data["family_relations"]
            if relation.get("source_person_id") in visible_person_ids or relation.get("target_person_id") in visible_person_ids
        ],
        "medical_histories": visible(data["medical_histories"], user),
        "corrections": [item for item in visible_persons + visible_households if item.get("validation_status") == "NEEDS_CORRECTION"],
        "forms": data.get("form_definitions", []),
    }
