"""
Route /api/v1/app-settings — Paramètres globaux de personnalisation de l'application.
Stockage : table system_settings (clé/valeur JSON via SystemSetting model).
"""
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...database import get_db
from ...models import SystemSetting
from ...dependencies import require_roles
from ...schemas import (
    AppBrandingIn,
    AppSettingsIn,
    AppFeaturesIn,
    AppHelpIn,
    AppSettingsOut,
    Role,
)
from ...services import db_audit

router = APIRouter(prefix="/app-settings", tags=["app-settings"])

# ── Default values ─────────────────────────────────────────────────────────────

DEFAULTS: dict[str, Any] = {
    "app.branding": {
        "app_name": "AfriCensus Link",
        "logo_url": "assets/logo.png",
        "primary_color": "#0284c7",
        "secondary_color": "#10b981",
        "primary_color_dark": "#38bdf8",
        "secondary_color_dark": "#34d399",
        "font_family": "Inter, Arial, sans-serif",
        "base_font_size": "14px",
        "card_radius": "16px",
        "button_radius": "8px",
        "sidebar_bg": "",
        "sidebar_text": "",
        "favicon_url": None,
        "login_heading": None,
        "login_subheading": None,
        "default_theme": "light",
    },
    "app.settings": {
        "default_locale": "fr",
        "timezone": "Africa/Abidjan",
        "date_format": "DD/MM/YYYY",
        "max_household_size": 30,
        "strict_collection_window": False,
    },
    "app.help": {
        "quick_guide": {
            "fr": "Bienvenue sur AfriCensus Link. Cette application vous permet de recenser et valider les informations de la population. Utilisez la barre de navigation sur votre gauche pour accéder aux différents modules en fonction de votre rôle.",
            "en": "Welcome to AfriCensus Link. This application allows you to enumerate and validate population information. Use the navigation bar on your left to access different modules based on your role.",
        },
        "contact_email": "support@africensus.local",
        "contact_phone": "+123 456 789 000",
    },
    "app.features": {
        "messaging": True,
        "family_tree": True,
        "medical_history": True,
        "custom_forms": True,
        "csv_export": True,
        "birth_declaration": True,
        "duplicates": True,
        "audit": True,
    },
}


def _get_setting(db: Session, key: str) -> dict[str, Any]:
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if row:
        return {**DEFAULTS[key], **row.value_json}
    return DEFAULTS[key]


def _upsert_setting(db: Session, key: str, value: dict[str, Any]) -> None:
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if row:
        row.value_json = value
    else:
        db.add(SystemSetting(key=key, value_json=value))
    db.commit()


# ── GET (public) ───────────────────────────────────────────────────────────────

@router.get(
    "",
    response_model=AppSettingsOut,
    summary="Lire tous les paramètres de l'application",
    description="Retourne le branding, les paramètres globaux et les feature flags. Endpoint public.",
)
def get_app_settings(db: Session = Depends(get_db)) -> dict[str, Any]:
    return {
        "branding": _get_setting(db, "app.branding"),
        "settings": _get_setting(db, "app.settings"),
        "features": _get_setting(db, "app.features"),
        "help": _get_setting(db, "app.help"),
    }


# ── PUT /branding ─────────────────────────────────────────────────────────────

@router.put(
    "/branding",
    response_model=AppSettingsOut,
    summary="Mettre à jour le branding",
)
def update_branding(
    payload: AppBrandingIn,
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    _upsert_setting(db, "app.branding", payload.model_dump())
    db_audit(db, user["id"], "UPDATE_APP_BRANDING", "system_settings", "app.branding")
    return get_app_settings(db)


# ── PUT /settings ─────────────────────────────────────────────────────────────

@router.put(
    "/settings",
    response_model=AppSettingsOut,
    summary="Mettre à jour les paramètres globaux",
)
def update_settings(
    payload: AppSettingsIn,
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    _upsert_setting(db, "app.settings", payload.model_dump())
    db_audit(db, user["id"], "UPDATE_APP_SETTINGS", "system_settings", "app.settings")
    return get_app_settings(db)


# ── PUT /features ─────────────────────────────────────────────────────────────

@router.put(
    "/features",
    response_model=AppSettingsOut,
    summary="Mettre à jour les feature flags",
)
def update_features(
    payload: AppFeaturesIn,
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    _upsert_setting(db, "app.features", payload.model_dump())
    db_audit(db, user["id"], "UPDATE_APP_FEATURES", "system_settings", "app.features")
    return get_app_settings(db)


# ── PUT /help ─────────────────────────────────────────────────────────────

@router.put(
    "/help",
    response_model=AppSettingsOut,
    summary="Mettre à jour la configuration d'aide (Guide et Contact)",
)
def update_help(
    payload: AppHelpIn,
    user: dict[str, Any] = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    _upsert_setting(db, "app.help", payload.model_dump())
    db_audit(db, user["id"], "UPDATE_APP_HELP", "system_settings", "app.help")
    return get_app_settings(db)
