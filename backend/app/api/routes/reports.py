from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from ...container import store
from ...dependencies import current_user, require_roles
from ...schemas import PopulationSummaryOut, Role
from ...services import audit, filter_items, visible


router = APIRouter(tags=["reports"])


@router.get("/reports/population-summary", response_model=PopulationSummaryOut)
def population_summary(zone_id: str | None = None, user: dict[str, Any] = Depends(current_user)) -> PopulationSummaryOut:
    persons = filter_items(visible(store.all()["persons"], user), zone_id, None)
    households = filter_items(visible(store.all()["households"], user), zone_id, None)
    by_gender: dict[str, int] = {}
    for person in persons:
        by_gender[person.get("gender", "UNKNOWN")] = by_gender.get(person.get("gender", "UNKNOWN"), 0) + 1
    avg_members = round(sum(h.get("member_count", 0) for h in households) / max(len(households), 1), 2)
    return PopulationSummaryOut(
        totalPersons=len(persons),
        totalHouseholds=len(households),
        personsByGender=by_gender,
        averageMembersPerHousehold=avg_members,
    )


@router.get("/exports/persons.csv")
def export_persons(user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR, Role.STATISTICIAN))) -> StreamingResponse:
    data = store.all()
    audit(data, user["id"], "EXPORT_DATA", "persons", "csv")
    store.save(data)
    rows = ["id,first_name,last_name,gender,zone_id,validation_status"]
    for person in visible(data["persons"], user):
        rows.append(",".join(str(person.get(key, "")) for key in ("id", "first_name", "last_name", "gender", "zone_id", "validation_status")))
    return StreamingResponse(
        iter(["\n".join(rows)]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=persons.csv"},
    )
