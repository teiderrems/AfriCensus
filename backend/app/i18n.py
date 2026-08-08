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
        "email.reset.subject": "Réinitialisation de votre mot de passe AfriCensus",
        "email.reset.hello": "Bonjour",
        "email.reset.body": "Vous avez demandé la réinitialisation de votre mot de passe.",
        "email.reset.button": "Réinitialiser mon mot de passe",
        "email.reset.ignore": "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.",
        "email.reset.auto": "Ceci est un e-mail automatique, merci de ne pas y répondre.",
        "email.expire.subject": "Expiration prochaine de votre mot de passe",
        "email.expire.hello": "Bonjour",
        "email.expire.body1": "Votre mot de passe arrivera à expiration dans",
        "email.expire.body2": "jours",
        "email.expire.body3": "Pour des raisons de sécurité, nous vous demandons de le renouveler régulièrement.",
        "email.expire.button": "Changer mon mot de passe",
        "email.expire.block": "Si vous ne le changez pas avant cette date, votre compte sera temporairement bloqué jusqu'à ce que vous le réinitialisiez.",
        "email.mgr.subject": "Alerte : Expiration de mot de passe",
        "email.mgr.hello": "Bonjour",
        "email.mgr.body1": "Nous vous informons que le mot de passe de votre collaborateur",
        "email.mgr.body2": "expirera dans",
        "email.mgr.block": "Si ce mot de passe n'est pas renouvelé avant cette échéance, l'accès au compte sera bloqué.",
        "email.mgr.remind": "Merci de bien vouloir lui rappeler de procéder à ce changement.",
        "report.official": "RAPPORT OFFICIEL",
        "report.generated": "Généré le",
        "report.operator": "Opérateur",
        "report.summary": "SYNTHÈSE GLOBALE",
        "report.total_persons": "Population totale recensée",
        "report.total_households": "Ménages identifiés",
        "report.avg_members": "Taille moyenne par ménage",
        "report.no_doc": "Personnes sans document ID",
        "report.vulnerable": "Personnes vulnérables",
        "report.by_gender": "RÉPARTITION PAR GENRE",
        "report.by_age": "RÉPARTITION PAR TRANCHE D'ÂGE",
        "report.by_status": "RÉPARTITION PAR STATUT DE VALIDATION",
        "report.by_zone": "RÉPARTITION PAR ZONE GÉOGRAPHIQUE",
        "report.total_records": "Total d'enregistrements"
    },
    "en": {
        "api.title": "AfriCensus Link API",
        "api.summary": "MVP API for AfriCensus Link",
        "errors.not_found": "Resource not found.",
        "errors.unauthorized": "Authentication required.",
        "sync.push.summary": "Send changes collected offline",
        "sync.pull.summary": "Download data available for offline mode",
        "email.reset.subject": "Reset your AfriCensus password",
        "email.reset.hello": "Hello",
        "email.reset.body": "You requested a password reset.",
        "email.reset.button": "Reset my password",
        "email.reset.ignore": "If you didn't request this, you can safely ignore this email.",
        "email.reset.auto": "This is an automated email, please do not reply.",
        "email.expire.subject": "Your password is about to expire",
        "email.expire.hello": "Hello",
        "email.expire.body1": "Your password will expire in",
        "email.expire.body2": "days",
        "email.expire.body3": "For security reasons, we ask you to renew it regularly.",
        "email.expire.button": "Change my password",
        "email.expire.block": "If you don't change it before this date, your account will be temporarily locked until you reset it.",
        "email.mgr.subject": "Alert: Password Expiration",
        "email.mgr.hello": "Hello",
        "email.mgr.body1": "We would like to inform you that the password of your team member",
        "email.mgr.body2": "will expire in",
        "email.mgr.block": "If this password is not renewed before this deadline, account access will be blocked.",
        "email.mgr.remind": "Please remind them to proceed with this change.",
        "report.official": "OFFICIAL REPORT",
        "report.generated": "Generated on",
        "report.operator": "Operator",
        "report.summary": "GLOBAL SUMMARY",
        "report.total_persons": "Total Enumerated Population",
        "report.total_households": "Identified Households",
        "report.avg_members": "Average Members per Household",
        "report.no_doc": "Persons Without ID Document",
        "report.vulnerable": "Vulnerable Persons",
        "report.by_gender": "DISTRIBUTION BY GENDER",
        "report.by_age": "DISTRIBUTION BY AGE GROUP",
        "report.by_status": "DISTRIBUTION BY VALIDATION STATUS",
        "report.by_zone": "DISTRIBUTION BY GEOGRAPHIC ZONE",
        "report.total_records": "Total Records"
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
