from typing import Any
from uuid import uuid4
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import asc

from ...database import get_db
from ...models import FaqItem
from ...dependencies import require_roles
from ...schemas import FaqIn, FaqOut, Role
from ...services import db_audit

router = APIRouter(prefix="/faq", tags=["faq"])

@router.get("", response_model=list[FaqOut], summary="Lister les questions de la FAQ")
def list_faq(db: Session = Depends(get_db)) -> Any:
    return db.query(FaqItem).order_by(asc(FaqItem.order)).all()


@router.post("", response_model=FaqOut, summary="Créer un article FAQ")
def create_faq(
    payload: FaqIn,
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(get_db),
) -> Any:
    now = datetime.now().isoformat()
    new_faq = FaqItem(
        id=uuid4().hex,
        question=payload.question,
        answer=payload.answer,
        category=payload.category,
        order=payload.order,
        is_active=payload.is_active,
        created_at=now,
        updated_at=now,
    )
    db.add(new_faq)
    db.commit()
    db.refresh(new_faq)
    db_audit(db, user["id"], "CREATE_FAQ", "faq_items", new_faq.id)
    return new_faq


@router.put("/{faq_id}", response_model=FaqOut, summary="Mettre à jour un article FAQ")
def update_faq(
    faq_id: str,
    payload: FaqIn,
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(get_db),
) -> Any:
    faq = db.query(FaqItem).filter(FaqItem.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="Article FAQ introuvable")
    
    faq.question = payload.question
    faq.answer = payload.answer
    faq.category = payload.category
    faq.order = payload.order
    faq.is_active = payload.is_active
    faq.updated_at = datetime.now().isoformat()
    
    db.commit()
    db.refresh(faq)
    db_audit(db, user["id"], "UPDATE_FAQ", "faq_items", faq.id)
    return faq


@router.delete("/{faq_id}", summary="Supprimer un article FAQ")
def delete_faq(
    faq_id: str,
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(get_db),
) -> Any:
    faq = db.query(FaqItem).filter(FaqItem.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="Article FAQ introuvable")
    
    db.delete(faq)
    db.commit()
    db_audit(db, user["id"], "DELETE_FAQ", "faq_items", faq_id)
    return {"message": "Supprimé avec succès"}
