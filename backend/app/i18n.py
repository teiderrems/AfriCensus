from collections.abc import Awaitable, Callable
from typing import Any

from fastapi import FastAPI, Request, Response


SUPPORTED_LANGUAGES = ("fr", "en")

CATALOGS: dict[str, dict[str, str]] = {
    "fr": {
        "api.title": "AfriCensus Link API",
        "api.summary": "API MVP pour AfriCensus Link",
        "errors.not_found": "Ressource introuvable.",
        "errors.unauthorized": "Authentification requise.",
        "sync.push.summary": "Envoyer les changements collectés hors ligne",
        "sync.pull.summary": "Télécharger les données disponibles pour le mode hors ligne",
    },
    "en": {
        "api.title": "AfriCensus Link API",
        "api.summary": "MVP API for AfriCensus Link",
        "errors.not_found": "Resource not found.",
        "errors.unauthorized": "Authentication required.",
        "sync.push.summary": "Send changes collected offline",
        "sync.pull.summary": "Download data available for offline mode",
    },
}


def normalize_language(value: str | None, default_language: str = "fr") -> str:
    if not value:
        return default_language
    language = value.split(";")[0].split(",")[0].strip().lower().split("-")[0]
    return language if language in SUPPORTED_LANGUAGES else default_language


def catalog_for(language: str) -> dict[str, str]:
    return CATALOGS.get(normalize_language(language), CATALOGS["fr"])


def setup_i18n(application: FastAPI, default_language: str) -> None:
    @application.middleware("http")
    async def i18n_middleware(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        requested = request.headers.get("x-language") or request.headers.get("accept-language")
        language = normalize_language(requested, default_language)
        request.state.language = language
        response = await call_next(request)
        response.headers["Content-Language"] = language
        response.headers["Vary"] = "Accept-Language"
        return response


def localized_response(request: Request) -> dict[str, Any]:
    language = getattr(request.state, "language", "fr")
    return {"language": language, "catalog": catalog_for(language)}
