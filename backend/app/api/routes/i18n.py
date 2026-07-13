from typing import Any

from fastapi import APIRouter, Query, Request

from ...field_i18n import all_field_metadata, field_metadata
from ...i18n import SUPPORTED_LANGUAGES, catalog_for, localized_response, normalize_language


router = APIRouter(prefix="/i18n", tags=["i18n"])


@router.get(
    "/languages",
    summary="Lister les langues supportées",
    description="Retourne les codes de langue disponibles pour l’interface et les réponses localisées.",
)
def languages() -> dict[str, Any]:
    return {"default": "fr", "languages": list(SUPPORTED_LANGUAGES)}


@router.get(
    "/catalog",
    summary="Lire le catalogue de traduction backend",
    description="Retourne les libellés backend pour la langue demandée ou négociée via `Accept-Language`.",
)
def catalog(request: Request, lang: str | None = Query(default=None, description="Code de langue optionnel, par exemple `fr` ou `en`.")) -> dict[str, Any]:
    if lang:
        language = normalize_language(lang)
        return {"language": language, "catalog": catalog_for(language)}
    return localized_response(request)


@router.get(
    "/fields",
    summary="Lire les libellés multilingues des champs métier",
    description="Retourne les labels et aides des champs de modèles pour alimenter les formulaires, tableaux et drawers côté frontend.",
)
def fields(
    request: Request,
    lang: str | None = Query(default=None, description="Code de langue optionnel, par exemple `fr` ou `en`."),
    model: str | None = Query(default=None, description="Nom technique du modèle, par exemple `person`, `household` ou `medical_history`."),
) -> dict[str, Any]:
    language = normalize_language(lang or getattr(request.state, "language", None))
    if model:
        return {"language": language, "model": model, "fields": field_metadata(model, language)}
    return all_field_metadata(language)
