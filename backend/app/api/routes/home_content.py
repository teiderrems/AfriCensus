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


DEFAULT_HOME_DATA = {
    "id": "default-home-content",
    "brand": "AfriCensus Link",
    "nav_links": [
        {"id": "nav-1", "label": {"fr": "Accueil", "en": "Home"}, "href": "/"},
        {"id": "nav-2", "label": {"fr": "Portail", "en": "Portal"}, "href": "/portal"},
    ],
    "actions": [
        {"id": "act-1", "label": {"fr": "Se connecter", "en": "Sign In"}, "href": "/login", "style": "primary"}
    ],
    "hero": {
        "badge": {"fr": "Recensement National 2026", "en": "National Census 2026"},
        "title": {"fr": "Plateforme Numérique de Recensement & Cartographie", "en": "Digital Census & Mapping Platform"},
        "subtitle": {"fr": "Collecte moderne, suivi terrain en temps réel et analyse démographique institutionnelle.", "en": "Modern collection, real-time field tracking, and institutional demographic analytics."},
        "image_url": None,
        "image_alt": None,
        "actions": [
            {"id": "ha-1", "label": {"fr": "Accéder au Portail", "en": "Access Portal"}, "href": "/portal", "style": "primary", "icon": "layout-dashboard"},
            {"id": "ha-2", "label": {"fr": "Se connecter", "en": "Sign In"}, "href": "/login", "style": "secondary", "icon": "log-in"}
        ]
    },
    "metrics": [
        {"id": "m1", "value": {"fr": "100%", "en": "100%"}, "label": {"fr": "Couverture Territoriale", "en": "Territorial Coverage"}, "tone": "primary"},
        {"id": "m2", "value": {"fr": "24/7", "en": "24/7"}, "label": {"fr": "Disponibilité Système", "en": "System Availability"}, "tone": "success"},
        {"id": "m3", "value": {"fr": "100%", "en": "100%"}, "label": {"fr": "Conformité Normes", "en": "Standard Compliance"}, "tone": "warning"}
    ],
    "features_section": {
        "eyebrow": {"fr": "Fonctionnalités Clés", "en": "Key Features"},
        "title": {"fr": "Une Solution Complète de Gestion Démographique", "en": "A Comprehensive Demographic Management Solution"},
        "text": {"fr": "AfriCensus Link fournit les outils nécessaires pour orchestrer l'ensemble du cycle de vie du recensement.", "en": "AfriCensus Link provides the necessary tools to orchestrate the complete census lifecycle."},
        "bullets": [
            {"fr": "Cartographie et découpage des zones de collecte", "en": "Mapping and collection zone division"},
            {"fr": "Collecte mobile hors ligne avec synchronisation automatique", "en": "Offline mobile collection with automatic synchronization"},
            {"fr": "Validation hiérarchique et détection de doublons", "en": "Hierarchical validation and duplicate detection"}
        ]
    },
    "values_section": [
        {"id": "val-1", "title": {"fr": "Souveraineté des Données", "en": "Data Sovereignty"}, "text": {"fr": "Hébergement et contrôle stricts des données statistiques nationales.", "en": "Strict hosting and control of national statistical data."}, "icon": "shield"},
        {"id": "val-2", "title": {"fr": "Précision & Traçabilité", "en": "Accuracy & Traceability"}, "text": {"fr": "Piste d'audit complète pour chaque enregistrement démographique.", "en": "Complete audit trail for every demographic record."}, "icon": "check-circle"},
        {"id": "val-3", "title": {"fr": "Inclusivité", "en": "Inclusivity"}, "text": {"fr": "Support multilingue et accessibilité pour tous les agents de terrain.", "en": "Multilingual support and accessibility for all field agents."}, "icon": "users"}
    ],
    "footer": {
        "title": {"fr": "AfriCensus Link", "en": "AfriCensus Link"},
        "text": {"fr": "Système National de Recensement et de Statistique.", "en": "National Census and Statistics System."},
        "contact": {"fr": "support@africensus.org", "en": "support@africensus.org"}
    },
    "published": True
}


def _current_home_content(db: Session) -> dict[str, Any]:
    content = db.query(HomeContent).filter(HomeContent.deleted_at.is_(None)).first()
    if not content:
        try:
            content = HomeContent(
                id=DEFAULT_HOME_DATA["id"],
                data=DEFAULT_HOME_DATA,
                version=1,
                published=True
            )
            db.add(content)
            db.commit()
            db.refresh(content)
            return content.to_dict()
        except Exception:
            db.rollback()
            return DEFAULT_HOME_DATA
    return content.to_dict()
