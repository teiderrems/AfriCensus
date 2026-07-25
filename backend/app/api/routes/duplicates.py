import math
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ...database import get_db
from ...dependencies import require_roles
from ...models import DuplicateCandidate, Person
from ...schemas import PaginatedResponse, Role

router = APIRouter(prefix="/duplicates", tags=["duplicates"])


@router.get("", response_model=PaginatedResponse[dict[str, Any]])
def list_duplicates(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=10, ge=1, le=100, description="Items per page"),
    status: str | None = Query(default="PENDING", description="Filter by status"),
    sort_by: str | None = Query(default=None, description="Sort field"),
    sort_order: str = Query(default="desc", description="Sort direction"),
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR, Role.STATISTICIAN)),
    db: Session = Depends(get_db),
):
    query = select(DuplicateCandidate)
    if status:
        query = query.where(DuplicateCandidate.status == status)

    if sort_by and hasattr(DuplicateCandidate, sort_by):
        col = getattr(DuplicateCandidate, sort_by)
        query = query.order_by(col.desc() if sort_order.lower() == "desc" else col.asc())
    else:
        query = query.order_by(DuplicateCandidate.score.desc())

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    total_pages = max(1, math.ceil(total / page_size)) if page_size > 0 else 1

    start = (page - 1) * page_size
    candidates = db.scalars(query.offset(start).limit(page_size)).all()

    person_ids = set()
    for c in candidates:
        person_ids.add(c.person_a_id)
        person_ids.add(c.person_b_id)

    persons_by_id = {}
    if person_ids:
        persons = db.scalars(select(Person).where(Person.id.in_(person_ids))).all()
        persons_by_id = {p.id: p.to_dict() for p in persons}

    items = []
    for c in candidates:
        cdict = c.to_dict()
        cdict["person_a"] = persons_by_id.get(c.person_a_id)
        cdict["person_b"] = persons_by_id.get(c.person_b_id)
        items.append(cdict)

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.post("/scan")
def scan_duplicates(
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR)),
    db: Session = Depends(get_db),
):
    persons = db.scalars(select(Person)).all()
    new_count = 0

    seen = {}
    for p in persons:
        key = f"{p.first_name.lower().strip()}_{p.last_name.lower().strip()}"
        if key in seen:
            other_p = seen[key]
            existing = db.scalar(
                select(DuplicateCandidate).where(
                    ((DuplicateCandidate.person_a_id == p.id) & (DuplicateCandidate.person_b_id == other_p.id))
                    | ((DuplicateCandidate.person_a_id == other_p.id) & (DuplicateCandidate.person_b_id == p.id))
                )
            )
            if not existing:
                cand = DuplicateCandidate(
                    id=f"dup_{uuid.uuid4().hex[:8]}",
                    person_a_id=other_p.id,
                    person_b_id=p.id,
                    score=95,
                    status="PENDING",
                    created_at=datetime.utcnow().isoformat(),
                )
                db.add(cand)
                new_count += 1
        else:
            seen[key] = p

    if new_count > 0:
        db.commit()

    return {"message": "Scan completed", "new_candidates_count": new_count}


@router.post("/{candidate_id}/resolve")
def resolve_duplicate(
    candidate_id: str,
    action: str = Query(..., description="Action to take: MERGE or NOT_DUPLICATE"),
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN, Role.SUPERVISOR)),
    db: Session = Depends(get_db),
):
    cand = db.scalar(select(DuplicateCandidate).where(DuplicateCandidate.id == candidate_id))
    if not cand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    cand.status = action
    db.commit()

    return {"success": True, "id": candidate_id, "status": action}
