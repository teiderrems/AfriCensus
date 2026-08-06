from typing import Any

from fastapi import APIRouter, Depends, Query

from ...database import get_db
from ...dependencies import require_roles
from ...schemas import Role, PaginatedResponse
from ...db_services import visible_query
from sqlalchemy.orm import Session
from sqlalchemy import select, literal, union_all, String, or_, func, desc
from ...models import Person, Household, FormResponse
import math


router = APIRouter(prefix="/validation-queue", tags=["validation"])


@router.get("", response_model=PaginatedResponse[dict[str, Any]])
def validation_queue(
    search: str | None = Query(default=None, description="Recherche par nom ou code."),
    entity_type: str | None = Query(default=None, description="Filtrer par type d'entité (persons, households)."),
    page: int = Query(default=1, ge=1, description="Numéro de page."),
    page_size: int = Query(default=10, ge=1, le=100, description="Taille de page."),
    sort_by: str | None = Query(default='updated_at', description="Champ de tri (updated_at, status, name)."),
    sort_order: str = Query(default='desc', description="Ordre de tri (asc, desc)."),
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR, Role.AUDITOR)),
    db: Session = Depends(get_db),
):
    queries = []
    
    if not entity_type or entity_type == 'households':
        hq = select(
            Household.id.label('id'),
            literal('households').label('entity_type'),
            Household.updated_at.label('updated_at'),
            Household.validation_status.label('status'),
            Household.household_code.label('name'),
        ).where(Household.validation_status.in_(["SUBMITTED", "NEEDS_CORRECTION"]))
        hq = visible_query(hq, Household, user)
        if search:
            hq = hq.where(Household.household_code.ilike(f"%{search}%"))
        queries.append(hq)
        
    if not entity_type or entity_type == 'persons':
        pq = select(
            Person.id.label('id'),
            literal('persons').label('entity_type'),
            Person.updated_at.label('updated_at'),
            Person.validation_status.label('status'),
            (Person.first_name + " " + Person.last_name).label('name')
        ).where(Person.validation_status.in_(["SUBMITTED", "NEEDS_CORRECTION"]))
        pq = visible_query(pq, Person, user)
        if search:
            search_lower = f"%{search.lower()}%"
            pq = pq.where(or_(
                Person.first_name.ilike(search_lower),
                Person.last_name.ilike(search_lower)
            ))
        queries.append(pq)
        
    if not entity_type or entity_type == 'form_responses':
        fq = select(
            FormResponse.id.label('id'),
            literal('form_responses').label('entity_type'),
            FormResponse.updated_at.label('updated_at'),
            FormResponse.validation_status.label('status'),
            literal('Formulaire Dynamique').label('name')
        ).where(FormResponse.validation_status.in_(["SUBMITTED", "NEEDS_CORRECTION"]))
        fq = visible_query(fq, FormResponse, user)
        queries.append(fq)
        
    if not queries:
        return {"items": [], "total": 0, "page": page, "page_size": page_size, "total_pages": 1}
        
    union_q = union_all(*queries).subquery()
    
    total = db.scalar(select(func.count()).select_from(union_q)) or 0
    total_pages = max(1, math.ceil(total / page_size)) if page_size > 0 else 1
    
    start = (page - 1) * page_size
    
    sort_col = getattr(union_q.c, sort_by if sort_by in ['updated_at', 'status', 'name'] else 'updated_at', union_q.c.updated_at)
    order_clause = sort_col.desc() if sort_order.lower() == 'desc' else sort_col.asc()
    
    paged_q = select(union_q).order_by(order_clause).offset(start).limit(page_size)
    
    results = db.execute(paged_q).all()
    
    household_ids = [r.id for r in results if r.entity_type == 'households']
    person_ids = [r.id for r in results if r.entity_type == 'persons']
    form_response_ids = [r.id for r in results if r.entity_type == 'form_responses']
    
    entities = []
    if household_ids:
        households = db.scalars(select(Household).where(Household.id.in_(household_ids))).all()
        for h in households:
            d = h.to_dict()
            d['entity_type'] = 'households'
            entities.append(d)
            
    if person_ids:
        persons = db.scalars(select(Person).where(Person.id.in_(person_ids))).all()
        for p in persons:
            d = p.to_dict()
            d['entity_type'] = 'persons'
            entities.append(d)
            
    if form_response_ids:
        form_responses = db.scalars(select(FormResponse).where(FormResponse.id.in_(form_response_ids))).all()
        for f in form_responses:
            d = f.to_dict()
            d['entity_type'] = 'form_responses'
            entities.append(d)
            
    order_map = { (r.id, r.entity_type): i for i, r in enumerate(results) }
    entities.sort(key=lambda x: order_map.get((x['id'], x['entity_type']), 9999))
    
    return {
        "items": entities,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }
