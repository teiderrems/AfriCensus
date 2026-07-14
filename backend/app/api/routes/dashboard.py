from typing import Any

from collections import Counter
from datetime import date, timedelta

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


@router.get("/analytics")
def dashboard_analytics(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    data = store.all()
    persons = visible(data["persons"], user)
    households = visible(data["households"], user)
    zones = [z for z in data["zones"] if can_see_zone(user, z["id"])]

    # Gender distribution
    gender_counts = Counter(p.get("gender", "UNKNOWN") for p in persons)
    gender_distribution = dict(gender_counts)

    # Age groups
    age_groups = {"0-14": 0, "15-24": 0, "25-44": 0, "45-64": 0, "65+": 0}
    for person in persons:
        age = _estimate_age(person)
        if age is not None:
            if age < 15:
                age_groups["0-14"] += 1
            elif age < 25:
                age_groups["15-24"] += 1
            elif age < 45:
                age_groups["25-44"] += 1
            elif age < 65:
                age_groups["45-64"] += 1
            else:
                age_groups["65+"] += 1

    # Validation breakdown
    statuses = ["DRAFT", "SUBMITTED", "VALIDATED", "NEEDS_CORRECTION", "REJECTED"]
    all_records = persons + households
    validation_counts = Counter(r.get("validation_status", "DRAFT") for r in all_records)
    validation_breakdown = {s: validation_counts.get(s, 0) for s in statuses}

    # Submissions trend (last 30 days)
    today = date.today()
    trend: dict[str, int] = {}
    for i in range(29, -1, -1):
        day = today - timedelta(days=i)
        trend[day.isoformat()] = 0
    for record in all_records:
        created = record.get("created_at", "")
        if created:
            day_str = created[:10]
            if day_str in trend:
                trend[day_str] += 1
    submissions_trend = [{"date": d, "count": c} for d, c in trend.items()]

    # Zone comparison
    zone_comparison = []
    for zone in zones:
        zid = zone["id"]
        zone_comparison.append({
            "name": zone["name"],
            "persons": sum(1 for p in persons if p.get("zone_id") == zid),
            "households": sum(1 for h in households if h.get("zone_id") == zid),
        })

    return {
        "genderDistribution": gender_distribution,
        "ageGroups": age_groups,
        "validationBreakdown": validation_breakdown,
        "submissionsTrend": submissions_trend,
        "zoneComparison": zone_comparison,
    }


def _estimate_age(person: dict[str, Any]) -> int | None:
    if person.get("estimated_age") is not None:
        try:
            return int(person["estimated_age"])
        except (ValueError, TypeError):
            pass
    birth = person.get("birth_date")
    if birth:
        try:
            today = date.today()
            parts = birth[:10].split("-")
            birth_date = date(int(parts[0]), int(parts[1]), int(parts[2]))
            return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        except (ValueError, IndexError):
            pass
    return None
