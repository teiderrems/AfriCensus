from typing import Any

from fastapi import APIRouter, Depends

from ...container import store
from ...dependencies import current_user
from ...services import can_see_zone, visible


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def dashboard_summary(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    data = store.all()
    persons = visible(data["persons"], user)
    households = visible(data["households"], user)
    submitted = [*filter(lambda item: item.get("validation_status") == "SUBMITTED", persons + households)]
    validated = [*filter(lambda item: item.get("validation_status") == "VALIDATED", persons + households)]
    corrections = [*filter(lambda item: item.get("validation_status") == "NEEDS_CORRECTION", persons + households)]
    return {
        "totalPersons": len(persons),
        "totalHouseholds": len(households),
        "submitted": len(submitted),
        "validated": len(validated),
        "needsCorrection": len(corrections),
        "potentialDuplicates": len(data["duplicate_candidates"]),
        "activeAgents": len([u for u in data["users"] if u["role"] == "AGENT" and u["active"]]),
        "zoneProgress": [
            {"id": z["id"], "name": z["name"], "progress": z.get("progress", 0), "status": z["status"]}
            for z in data["zones"]
            if can_see_zone(user, z["id"])
        ],
        "recentSubmissions": sorted(persons + households, key=lambda item: item.get("updated_at", ""), reverse=True)[:8],
    }
