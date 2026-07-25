from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from sqlalchemy.orm import Session
from ...database import get_db
from ...models import HomeContent
from ...dependencies import require_roles
from ...schemas import HomeContentIn, HomeContentOut, Role, now_iso
from ...services import db_audit
from ...services import db_audit


router = APIRouter(prefix="/home-content", tags=["home-content"])


@router.get(
    "",
    response_model=HomeContentOut,
    summary="Lire le contenu publié de la page d’accueil",
    description="Retourne le document de contenu qui alimente dynamiquement la home publique Angular.",
)
def read_home_content(
    request: Request,
    lang: str | None = Query(default=None, description="Langue à résoudre, par exemple `fr` ou `en`."),
    raw: bool = Query(default=False, description="Retourner le document source multilingue sans résolution."),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    content = _current_home_content(db)
    if not content.get("published", True):
        raise HTTPException(status_code=404, detail="Home content is not published")
    if raw:
        return content
    return resolve_home_content(content, resolve_language(lang, request.headers.get("accept-language")))


@router.put(
    "",
    response_model=HomeContentOut,
    summary="Mettre à jour le contenu de la page d’accueil",
    description="Permet à un administrateur de modifier les textes, métriques, actions, sections et coordonnées affichés sur la home.",
)
def update_home_content(payload: HomeContentIn, user: dict[str, Any] = Depends(require_roles(Role.ADMIN)), db: Session = Depends(get_db)) -> dict[str, Any]:
    current_model = db.query(HomeContent).filter(HomeContent.deleted_at.is_(None)).first()
    if not current_model:
        raise HTTPException(status_code=404, detail="home_content not found")
        
    for key, value in payload.model_dump().items():
        setattr(current_model, key, value)
        
    current_model.updated_at = now_iso()
    db_audit(db, user["id"], "UPDATE_HOME_CONTENT", "home_content", current_model.id)
    db.commit()
    db.refresh(current_model)
    return current_model.to_dict()


def resolve_language(lang: str | None, accept_language: str | None) -> str:
    supported = {"fr", "en"}
    if lang and lang[:2].lower() in supported:
        return lang[:2].lower()
    for item in (accept_language or "").split(","):
        candidate = item.strip().split(";")[0][:2].lower()
        if candidate in supported:
            return candidate
    return "fr"


def resolve_home_content(content: dict[str, Any], lang: str) -> dict[str, Any]:
    return {
        **content,
        "brand": localized(content.get("brand"), lang),
        "nav_links": [resolve_link(link, lang) for link in content.get("nav_links", [])],
        "actions": [resolve_link(action, lang) for action in content.get("actions", [])],
        "hero": resolve_hero(content.get("hero", {}), lang),
        "metrics": [resolve_metric(metric, lang) for metric in content.get("metrics", [])],
        "values": [resolve_value(value, lang) for value in content.get("values", [])],
        "sections": [resolve_section(section, lang) for section in content.get("sections", [])],
        "footer": resolve_footer(content.get("footer", {}), lang),
    }


def resolve_link(link: dict[str, Any], lang: str) -> dict[str, Any]:
    return {**link, "label": localized(link.get("label"), lang)}


def resolve_hero(hero: dict[str, Any], lang: str) -> dict[str, Any]:
    return {
        **hero,
        "badge": localized(hero.get("badge"), lang),
        "title": localized(hero.get("title"), lang),
        "subtitle": localized(hero.get("subtitle"), lang),
        "image_alt": localized(hero.get("image_alt"), lang) if hero.get("image_alt") is not None else None,
        "actions": [resolve_link(action, lang) for action in hero.get("actions", [])],
    }


def resolve_metric(metric: dict[str, Any], lang: str) -> dict[str, Any]:
    return {**metric, "value": localized(metric.get("value"), lang), "label": localized(metric.get("label"), lang)}


def resolve_value(value: dict[str, Any], lang: str) -> dict[str, Any]:
    return {**value, "title": localized(value.get("title"), lang), "text": localized(value.get("text"), lang)}


def resolve_section(section: dict[str, Any], lang: str) -> dict[str, Any]:
    return {
        **section,
        "eyebrow": localized(section.get("eyebrow"), lang),
        "title": localized(section.get("title"), lang),
        "text": localized(section.get("text"), lang),
        "bullets": [localized(item, lang) for item in section.get("bullets", [])],
    }


def resolve_footer(footer: dict[str, Any], lang: str) -> dict[str, Any]:
    return {
        **footer,
        "title": localized(footer.get("title"), lang),
        "text": localized(footer.get("text"), lang),
        "contact": localized(footer.get("contact"), lang),
    }


def localized(value: Any, lang: str) -> str:
    if isinstance(value, dict):
        fallback = value.get("fr") or next((item for item in value.values() if item), "")
        return str(value.get(lang) or fallback)
    if value is None:
        return ""
    return str(value)


def _current_home_content(db: Session) -> dict[str, Any]:
    content = db.query(HomeContent).filter(HomeContent.deleted_at.is_(None)).first()
    if not content:
        raise HTTPException(status_code=404, detail="home_content not found")
    return content.to_dict()
