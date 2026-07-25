from typing import Any
import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, or_, func, desc
from sqlalchemy.orm import Session

from ...database import get_db
from ...dependencies import require_roles
from ...models import AuditLog, User, Person, Household
from ...schemas import AuditLogOut, Role, PaginatedResponse


router = APIRouter(prefix="/audit-logs", tags=["audit"])


@router.get("", response_model=PaginatedResponse[dict[str, Any]])
def audit_logs(
    query: str | None = Query(default=None, alias="search"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=1000),
    sort_by: str | None = Query(default=None),
    sort_order: str = Query(default='asc'),
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.AUDITOR)),
    db: Session = Depends(get_db)
) -> Any:
    q = select(AuditLog, User.full_name.label('user_name')).outerjoin(User, AuditLog.user_id == User.id)
    
    if query:
        search_lower = f"%{query.lower()}%"
        q = q.where(or_(
            AuditLog.action.ilike(search_lower),
            AuditLog.entity_type.ilike(search_lower),
            User.full_name.ilike(search_lower)
        ))
        
    q = q.order_by(AuditLog.created_at.desc())
    
    count_query = select(func.count()).select_from(q.subquery())
    total = db.scalar(count_query) or 0
    total_pages = max(1, math.ceil(total / page_size)) if page_size > 0 else 1
    start = (page - 1) * page_size
    
    results = db.execute(q.offset(start).limit(page_size)).all()
    
    items = []
    for row in results:
        log = row[0].to_dict()
        log['user_name'] = row[1] or "system" if log.get('user_id') else "system"
        
        entity_id = log.get("entity_id")
        entity_type = log.get("entity_type")
        entity_name = entity_id
        
        if entity_type == 'households':
            h = db.scalar(select(Household.household_code).where(Household.id == entity_id))
            if h: entity_name = h
        elif entity_type == 'persons':
            p = db.execute(select(Person.first_name, Person.last_name).where(Person.id == entity_id)).first()
            if p: entity_name = f"{p[0]} {p[1]}"
        elif entity_type == 'users':
            u = db.scalar(select(User.full_name).where(User.id == entity_id))
            if u: entity_name = u
            
        log['entity_name'] = entity_name
        items.append(log)
        
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }
