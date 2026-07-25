from typing import Any
from collections import Counter
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, func, literal, union_all, desc

from ...database import get_db
from ...dependencies import current_user
from ...db_services import visible_query
from ...models import Person, Household, DuplicateCandidate, User, Zone

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/summary")
def dashboard_summary(user: dict[str, Any] = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    # Totals
    q_persons = visible_query(select(func.count(Person.id)), Person, user)
    total_persons = db.scalar(q_persons) or 0
    
    q_households = visible_query(select(func.count(Household.id)), Household, user)
    total_households = db.scalar(q_households) or 0

    # Validation breakdown
    q_p_status = visible_query(select(Person.validation_status, func.count(Person.id)).group_by(Person.validation_status), Person, user)
    p_status_counts = {r[0]: r[1] for r in db.execute(q_p_status).all()}
    
    q_h_status = visible_query(select(Household.validation_status, func.count(Household.id)).group_by(Household.validation_status), Household, user)
    h_status_counts = {r[0]: r[1] for r in db.execute(q_h_status).all()}
    
    submitted = p_status_counts.get("SUBMITTED", 0) + h_status_counts.get("SUBMITTED", 0)
    validated = p_status_counts.get("VALIDATED", 0) + h_status_counts.get("VALIDATED", 0)
    corrections = p_status_counts.get("NEEDS_CORRECTION", 0) + h_status_counts.get("NEEDS_CORRECTION", 0)
    
    # Duplicates & Agents
    total_dupes = db.scalar(select(func.count(DuplicateCandidate.id))) or 0
    active_agents = db.scalar(select(func.count(User.id)).where(User.role == 'AGENT', User.active == True)) or 0
    
    # Zones progress
    q_zones = select(Zone)
    if user["role"] != "ADMIN":
        if user.get("zone_ids"):
            q_zones = q_zones.where(Zone.id.in_(user["zone_ids"]))
        else:
            q_zones = q_zones.where(Zone.id.in_(["__NONE__"]))
    zones = db.scalars(q_zones).all()
    zone_progress = [{"id": z.id, "name": z.name, "progress": z.progress, "status": z.status} for z in zones]
    
    # Recent submissions (UNION + ORDER BY)
    pq = visible_query(select(Person.id.label('id'), literal('persons').label('type'), Person.updated_at.label('updated_at')), Person, user)
    hq = visible_query(select(Household.id.label('id'), literal('households').label('type'), Household.updated_at.label('updated_at')), Household, user)
    
    union_q = union_all(pq, hq).subquery()
    recent_q = select(union_q).order_by(desc(union_q.c.updated_at)).limit(50)
    recent_refs = db.execute(recent_q).all()
    
    recent_items = []
    p_ids = [r.id for r in recent_refs if r.type == 'persons']
    h_ids = [r.id for r in recent_refs if r.type == 'households']
    
    if p_ids:
        for p in db.scalars(select(Person).where(Person.id.in_(p_ids))).all():
            recent_items.append(p.to_dict())
    if h_ids:
        for h in db.scalars(select(Household).where(Household.id.in_(h_ids))).all():
            recent_items.append(h.to_dict())
            
    order_map = {r.id: i for i, r in enumerate(recent_refs)}
    recent_items.sort(key=lambda x: order_map.get(x['id'], 9999))
    
    return {
        "totalPersons": total_persons,
        "totalHouseholds": total_households,
        "submitted": submitted,
        "validated": validated,
        "needsCorrection": corrections,
        "potentialDuplicates": total_dupes,
        "activeAgents": active_agents,
        "zoneProgress": zone_progress,
        "recentSubmissions": recent_items,
    }


@router.get("/analytics")
def dashboard_analytics(user: dict[str, Any] = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    # Gender distribution (GROUP BY)
    q_gender = select(func.coalesce(Person.gender, 'UNKNOWN'), func.count(Person.id)).group_by(Person.gender)
    q_gender = visible_query(q_gender, Person, user)
    gender_distribution = {row[0]: row[1] for row in db.execute(q_gender).all()}

    # Age groups
    age_groups = {"0-14": 0, "15-24": 0, "25-44": 0, "45-64": 0, "65+": 0}
    q_ages = visible_query(select(Person.estimated_age, Person.birth_date), Person, user)
    for estimated_age, birth_date in db.execute(q_ages).all():
        age = _estimate_age_from_raw(estimated_age, birth_date)
        if age is not None:
            if age < 15: age_groups["0-14"] += 1
            elif age < 25: age_groups["15-24"] += 1
            elif age < 45: age_groups["25-44"] += 1
            elif age < 65: age_groups["45-64"] += 1
            else: age_groups["65+"] += 1

    # Validation breakdown (GROUP BY)
    q_p_status = visible_query(select(Person.validation_status, func.count(Person.id)).group_by(Person.validation_status), Person, user)
    p_status = {r[0]: r[1] for r in db.execute(q_p_status).all()}
    
    q_h_status = visible_query(select(Household.validation_status, func.count(Household.id)).group_by(Household.validation_status), Household, user)
    h_status = {r[0]: r[1] for r in db.execute(q_h_status).all()}
    
    statuses = ["DRAFT", "SUBMITTED", "VALIDATED", "NEEDS_CORRECTION", "REJECTED"]
    validation_breakdown = {s: p_status.get(s, 0) + h_status.get(s, 0) for s in statuses}

    # Submissions trend (GROUP BY)
    q_p_trend = visible_query(select(func.substr(Person.created_at, 1, 10), func.count(Person.id)).group_by(Person.created_at), Person, user)
    p_trend = {r[0]: r[1] for r in db.execute(q_p_trend).all()}
    
    q_h_trend = visible_query(select(func.substr(Household.created_at, 1, 10), func.count(Household.id)).group_by(Household.created_at), Household, user)
    h_trend = {r[0]: r[1] for r in db.execute(q_h_trend).all()}
    
    today = date.today()
    trend: dict[str, int] = {}
    for i in range(29, -1, -1):
        day = today - timedelta(days=i)
        day_str = day.isoformat()
        trend[day_str] = p_trend.get(day_str, 0) + h_trend.get(day_str, 0)
    submissions_trend = [{"date": d, "count": c} for d, c in trend.items()]

    # Zone comparison (GROUP BY)
    q_p_zone = visible_query(select(Person.zone_id, func.count(Person.id)).group_by(Person.zone_id), Person, user)
    p_zone = {r[0]: r[1] for r in db.execute(q_p_zone).all()}
    
    q_h_zone = visible_query(select(Household.zone_id, func.count(Household.id)).group_by(Household.zone_id), Household, user)
    h_zone = {r[0]: r[1] for r in db.execute(q_h_zone).all()}
    
    q_zones = select(Zone)
    if user["role"] != "ADMIN":
        if user.get("zone_ids"):
            q_zones = q_zones.where(Zone.id.in_(user["zone_ids"]))
        else:
            q_zones = q_zones.where(Zone.id.in_(["__NONE__"]))
    zones = db.scalars(q_zones).all()
    
    zone_comparison = []
    for zone in zones:
        zid = zone.id
        zone_comparison.append({
            "name": zone.name,
            "persons": p_zone.get(zid, 0),
            "households": h_zone.get(zid, 0),
        })

    return {
        "genderDistribution": gender_distribution,
        "ageGroups": age_groups,
        "validationBreakdown": validation_breakdown,
        "submissionsTrend": submissions_trend,
        "zoneComparison": zone_comparison,
    }

def _estimate_age_from_raw(estimated_age: int | None, birth_date: str | None) -> int | None:
    if estimated_age is not None:
        try:
            return int(estimated_age)
        except (ValueError, TypeError):
            pass
    if birth_date:
        try:
            today = date.today()
            parts = birth_date[:10].split("-")
            b_date = date(int(parts[0]), int(parts[1]), int(parts[2]))
            return today.year - b_date.year - ((today.month, today.day) < (b_date.month, b_date.day))
        except (ValueError, IndexError):
            pass
    return None
