from typing import Any
import json
from datetime import datetime, date

from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, case
from sqlalchemy.orm import Session

from ...dependencies import current_user, require_roles
from ...schemas import PopulationSummaryOut, Role
from ...database import get_db
from ...db_services import visible_query
from ...models import Person, Household, Zone


router = APIRouter(tags=["reports"])


def _calculate_age(birth_date_str: str | None) -> int | None:
    if not birth_date_str:
        return None
    try:
        bd = datetime.strptime(str(birth_date_str)[:10], "%Y-%m-%d").date()
        today = date.today()
        return today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day))
    except Exception:
        return None


def _loc_name(val: Any, lang: str = "fr") -> str:
    if isinstance(val, dict):
        return val.get(lang) or val.get("fr") or val.get("en") or (next(iter(val.values())) if val else "")
    if isinstance(val, str):
        val_str = val.strip()
        if val_str.startswith("{"):
            try:
                import json
                parsed = json.loads(val_str.replace("'", '"'))
                if isinstance(parsed, dict):
                    return parsed.get(lang) or parsed.get("fr") or parsed.get("en") or (next(iter(parsed.values())) if parsed else "")
            except Exception:
                pass
    return str(val or "")


@router.get("/reports/population-summary", response_model=PopulationSummaryOut)
def population_summary(
    zone_id: str | None = None,
    lang: str = Query(default="fr", description="Language code"),
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db)
) -> PopulationSummaryOut:
    # Query Persons
    q_persons = select(Person).where(Person.deleted_at == None)
    q_persons = visible_query(q_persons, Person, user)
    if zone_id:
        q_persons = q_persons.where(Person.zone_id == zone_id)
    
    persons = db.scalars(q_persons).all()
    total_persons = len(persons)
    
    # By Gender
    by_gender: dict[str, int] = {}
    # By Age Group
    by_age_group: dict[str, int] = {"0-14 ans": 0, "15-24 ans": 0, "25-59 ans": 0, "60+ ans": 0, "Inconnu": 0}
    # By Validation Status
    by_status: dict[str, int] = {}
    # By Zone
    by_zone_id: dict[str, int] = {}
    
    without_doc_count = 0
    vulnerable_count = 0

    # Map zone names
    zones = db.scalars(select(Zone)).all()
    zone_names = {z.id: f"{_loc_name(z.name, lang)} ({z.code})" for z in zones}

    for p in persons:
        g = p.gender or 'UNKNOWN'
        by_gender[g] = by_gender.get(g, 0) + 1
        
        st = p.validation_status or 'DRAFT'
        by_status[st] = by_status.get(st, 0) + 1

        zn = zone_names.get(p.zone_id, p.zone_id or "Non assigné")
        by_zone_id[zn] = by_zone_id.get(zn, 0) + 1

        if p.is_without_document:
            without_doc_count += 1

        age = _calculate_age(p.birth_date)
        if age is None:
            by_age_group["Inconnu"] += 1
        elif age < 15:
            by_age_group["0-14 ans"] += 1
        elif age < 25:
            by_age_group["15-24 ans"] += 1
        elif age < 60:
            by_age_group["25-59 ans"] += 1
        else:
            by_age_group["60+ ans"] += 1

        # Vulnerable rule: without ID document OR age < 5 OR age >= 60
        if p.is_without_document or (age is not None and (age < 5 or age >= 60)):
            vulnerable_count += 1

    # Query Households
    q_hh = select(Household).where(Household.deleted_at == None)
    q_hh = visible_query(q_hh, Household, user)
    if zone_id:
        q_hh = q_hh.where(Household.zone_id == zone_id)
        
    households = db.scalars(q_hh).all()
    total_hh = len(households)
    
    by_housing: dict[str, int] = {}
    by_occupancy: dict[str, int] = {}
    total_members = 0

    for h in households:
        ht = h.housing_type or "AUTRE"
        by_housing[ht] = by_housing.get(ht, 0) + 1
        
        oc = h.occupancy_status or "AUTRE"
        by_occupancy[oc] = by_occupancy.get(oc, 0) + 1
        
        total_members += (h.member_count or 0)

    avg_members = round(total_members / total_hh, 2) if total_hh > 0 else 0.0

    return PopulationSummaryOut(
        totalPersons=total_persons,
        totalHouseholds=total_hh,
        personsByGender=by_gender,
        personsByAgeGroup=by_age_group,
        personsByValidationStatus=by_status,
        personsByZone=by_zone_id,
        withoutDocumentCount=without_doc_count,
        vulnerablePersonsCount=vulnerable_count,
        averageMembersPerHousehold=avg_members,
        householdsByHousingType=by_housing,
        householdsByOccupancyStatus=by_occupancy,
    )


@router.get("/exports/{resource}")
def export_resource(
    resource: str,
    format: str = Query(default="csv", description="Format d'exportation: csv, excel, json, txt"),
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR, Role.STATISTICIAN, Role.AUDITOR)),
    db: Session = Depends(get_db)
) -> StreamingResponse:
    fmt = format.lower().strip()
    if fmt not in ["csv", "excel", "xlsx", "json", "txt"]:
        fmt = "csv"

    from ...services import db_audit
    db_audit(db, user["id"], "EXPORT_DATA", resource, fmt)
    db.commit()

    if resource == "persons":
        q = select(Person).where(Person.deleted_at == None)
        q = visible_query(q, Person, user)
        items = [p.to_dict() for p in db.scalars(q).all()]
        filename = f"recensement_personnes_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        field_order = ["id", "first_name", "last_name", "gender", "birth_date", "is_without_document", "validation_status", "zone_id", "household_id"]

    elif resource == "households":
        q = select(Household).where(Household.deleted_at == None)
        q = visible_query(q, Household, user)
        items = [h.to_dict() for h in db.scalars(h).all()]
        filename = f"recensement_menages_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        field_order = ["id", "household_code", "address_text", "housing_type", "occupancy_status", "member_count", "validation_status", "zone_id", "campaign_id"]

    else:
        # Full summary report
        summary = population_summary(user=user, db=db)
        items = [summary.model_dump()]
        filename = f"rapport_demographique_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        field_order = list(summary.model_dump().keys())

    # --- JSON FORMAT ---
    if fmt == "json":
        content = json.dumps(items, indent=2, ensure_ascii=False)
        return StreamingResponse(
            iter([content]),
            media_type="application/json; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}.json"'},
        )

    # --- TXT FORMAT ---
    elif fmt == "txt":
        lines = [
            "=" * 70,
            f"  AFRICENSUS LINK - RAPPORT OFFICIEL ({resource.upper()})",
            f"  Généré le: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"  Opérateur: {user.get('full_name')} (@{user.get('username')})",
            "=" * 70,
            "",
        ]
        if resource == "reports" or resource == "summary":
            s = items[0]
            lines.extend([
                "--- SYNTHÈSE GLOBALE ---",
                f"Population totale recensée : {s.get('totalPersons', 0)}",
                f"Ménages identifiés         : {s.get('totalHouseholds', 0)}",
                f"Taille moyenne par ménage  : {s.get('averageMembersPerHousehold', 0)} membres",
                f"Personnes sans document ID : {s.get('withoutDocumentCount', 0)}",
                f"Personnes vulnérables     : {s.get('vulnerablePersonsCount', 0)}",
                "",
                "--- RÉPARTITION PAR GENRE ---",
                *[f"  - {k}: {v}" for k, v in s.get("personsByGender", {}).items()],
                "",
                "--- RÉPARTITION PAR TRANCHE D'ÂGE ---",
                *[f"  - {k}: {v}" for k, v in s.get("personsByAgeGroup", {}).items()],
                "",
                "--- RÉPARTITION PAR STATUT DE VALIDATION ---",
                *[f"  - {k}: {v}" for k, v in s.get("personsByValidationStatus", {}).items()],
                "",
                "--- RÉPARTITION PAR ZONE GÉOGRAPHIQUE ---",
                *[f"  - {k}: {v}" for k, v in s.get("personsByZone", {}).items()],
            ])
        else:
            lines.append(f"Total d'enregistrements : {len(items)}\n")
            lines.append(" | ".join(field_order))
            lines.append("-" * 70)
            for item in items:
                lines.append(" | ".join(str(item.get(k, "")) for k in field_order))
        
        content = "\n".join(lines)
        return StreamingResponse(
            iter([content]),
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}.txt"'},
        )

    # --- EXCEL / XLSX / CSV FORMAT ---
    else:
        # Excel/CSV delimiter: ';' with UTF-8 BOM '\ufeff' so MS Excel opens directly with correct encoding and columns!
        sep = ";" if fmt in ["excel", "xlsx"] else ","
        ext = "xlsx" if fmt == "xlsx" else "csv"
        
        rows = [sep.join(field_order)]
        for item in items:
            row_vals = []
            for k in field_order:
                val = item.get(k, "")
                if isinstance(val, (dict, list)):
                    val = json.dumps(val, ensure_ascii=False).replace(sep, " ")
                else:
                    val = str(val).replace("\n", " ").replace(sep, " ")
                row_vals.append(val)
            rows.append(sep.join(row_vals))

        # UTF-8 BOM \ufeff ensures Excel opens natively without character glitches
        content = "\ufeff" + "\n".join(rows)
        media_type = "application/vnd.ms-excel" if fmt in ["excel", "xlsx"] else "text/csv; charset=utf-8"
        
        return StreamingResponse(
            iter([content]),
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}.{ext}"'},
        )
