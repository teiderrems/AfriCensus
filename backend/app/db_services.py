import math
from typing import Any
from sqlalchemy import Select, func, select, String, or_, cast
from sqlalchemy.orm import Session

def paginate_query(db: Session, query: Select, page: int, page_size: int, sort_by: str | None = None, sort_order: str = "asc") -> dict[str, Any]:
    count_query = select(func.count()).select_from(query.subquery())
    total = db.scalar(count_query) or 0
    
    total_pages = max(1, math.ceil(total / page_size)) if page_size > 0 else 1
    start = (page - 1) * page_size
    
    model = None
    if query.column_descriptions:
        model = query.column_descriptions[0].get('entity') or query.column_descriptions[0].get('type')

    if model:
        sort_col = None
        if sort_by and hasattr(model, sort_by):
            sort_col = getattr(model, sort_by)
            if hasattr(sort_col, 'type') and sort_col.type.__class__.__name__ in ('JSON', 'JSONB'):
                sort_col = cast(sort_col, String)
        else:
            sort_col = getattr(model, 'updated_at', None)
            if not sort_col:
                sort_col = getattr(model, 'created_at', None)
            if not sort_col:
                sort_col = getattr(model, 'id', None)
            sort_order = "desc"  # Default fallback sort is always descending for dates
            
        if sort_col is not None:
            if sort_order.lower() == 'desc':
                query = query.order_by(sort_col.desc())
            else:
                query = query.order_by(sort_col.asc())
        
    query = query.offset(start).limit(page_size)
    items = [row.to_dict() for row in db.scalars(query).all()]
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }

def filter_query(query: Select, model, zone_id: str | None = None, status_filter: str | None = None, search: str | None = None) -> Select:
    if zone_id and hasattr(model, 'zone_id'):
        query = query.where(model.zone_id == zone_id)
    if status_filter and hasattr(model, 'validation_status'):
        query = query.where(model.validation_status == status_filter)
    if search:
        search_lower = f"%{search.lower()}%"
        text_cols = [c for c in model.__table__.columns if isinstance(c.type, String)]
        if text_cols:
            query = query.where(or_(*(c.ilike(search_lower) for c in text_cols)))
    return query

def visible_query(query: Select, model, user: dict[str, Any]) -> Select:
    if hasattr(model, 'deleted_at'):
        query = query.where(model.deleted_at.is_(None))
    if hasattr(model, 'zone_id') and user["role"] != "ADMIN":
        if user.get("zone_ids"):
            query = query.where(model.zone_id.in_(user["zone_ids"]))
        else:
            # If user has no zone_ids and is not ADMIN, they should see nothing.
            query = query.where(model.zone_id.in_(["__NONE__"]))
    return query
