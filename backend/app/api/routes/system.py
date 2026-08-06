from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging

from ...database import get_db, Base, engine
from ...dependencies import require_roles
from ...models import User
from ...init_db import init_db

router = APIRouter(prefix="/system", tags=["system"])
logger = logging.getLogger(__name__)


@router.post("/seed", response_model=Dict[str, Any], summary="Déclencher le peuplement de la base de données")
def seed_database(
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles(["ADMIN"]))
) -> Any:
    """
    Peuple la base de données avec les données initiales.
    Accessible uniquement aux administrateurs.
    """
    try:
        init_db(db)
        return {"message": "Base de données peuplée avec succès."}
    except Exception as e:
        logger.error(f"Erreur lors du peuplement : {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/reset", response_model=Dict[str, Any], summary="Réinitialiser et peupler la base de données")
def reset_database(
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles(["ADMIN"]))
) -> Any:
    """
    Supprime toutes les données existantes (vidage des tables) et repeuple la base de données.
    Accessible uniquement aux administrateurs.
    """
    try:
        dialect = engine.url.get_dialect().name
        
        if dialect == "sqlite":
            # For SQLite
            db.execute(text("PRAGMA foreign_keys = OFF;"))
            for table in reversed(Base.metadata.sorted_tables):
                db.execute(table.delete())
            db.execute(text("PRAGMA foreign_keys = ON;"))
        else:
            # For PostgreSQL
            tables = ", ".join([table.name for table in Base.metadata.sorted_tables])
            db.execute(text(f"TRUNCATE {tables} CASCADE;"))
            
        db.commit()

        # Re-initialize the database
        init_db(db)

        return {"message": "Base de données réinitialisée et peuplée avec succès."}
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur lors de la réinitialisation : {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
