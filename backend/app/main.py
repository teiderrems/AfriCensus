import sys
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from .api.router import api_router
from .config import get_settings
from .i18n import setup_i18n
from .security_headers import setup_security_headers


OPENAPI_TAGS = [
    {"name": "health", "description": "Vérification de disponibilité du service."},
    {"name": "i18n", "description": "Langues supportées, catalogues de traduction et négociation de locale."},
    {"name": "home-content", "description": "Contenu dynamique de la page d’accueil administrable."},
    {"name": "auth", "description": "Connexion, refresh token et identité utilisateur."},
    {"name": "users", "description": "Administration des utilisateurs, rôles, zones affectées et statut actif."},
    {"name": "dashboard", "description": "Indicateurs de pilotage pour superviseurs et administrateurs."},
    {"name": "zones", "description": "Gestion de la hiérarchie géographique et des zones de collecte."},
    {"name": "campaigns", "description": "Campagnes de recensement et périmètres associés."},
    {"name": "households", "description": "Création, consultation, soumission et gestion des ménages."},
    {"name": "persons", "description": "Fiches individuelles, validation et arborescence familiale."},
    {"name": "family-relations", "description": "Liens familiaux, relations inverses et décisions superviseur."},
    {"name": "validation", "description": "File de validation des fiches soumises ou à corriger."},
    {"name": "sync", "description": "Synchronisation mobile hors ligne : push et pull."},
    {"name": "reports", "description": "Rapports statistiques et exports CSV."},
    {"name": "audit", "description": "Traçabilité des actions sensibles et logs d’audit."},
]


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        summary="API MVP pour AfriCensus Link",
        description=(
            "API de recensement modulaire couvrant authentification, zones, campagnes, ménages, "
            "personnes, relations familiales, synchronisation hors ligne, validation superviseur, "
            "rapports et audit. Les endpoints privés attendent un header `Authorization: Bearer <token>`."
        ),
        contact={"name": "AfriCensus Link"},
        license_info={"name": "Proprietary"},
        openapi_tags=OPENAPI_TAGS,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        swagger_ui_parameters={
            "persistAuthorization": True,
            "displayRequestDuration": True,
            "filter": True,
            "tryItOutEnabled": True,
        },
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_host_list)
    setup_security_headers(application, settings.security_headers_enabled)
    setup_i18n(application, settings.default_language)
    application.include_router(api_router)
    mount_frontend(application, settings.frontend_path, settings.frontend_public_url)
    return application


def mount_frontend(application: FastAPI, frontend_dist, frontend_public_url: str = "") -> None:
    if not frontend_dist.exists():
        if frontend_public_url:
            public_url = frontend_public_url.rstrip("/")

            @application.get("/", include_in_schema=False)
            def redirect_to_frontend_root():
                return RedirectResponse(public_url)

            @application.get("/{full_path:path}", include_in_schema=False)
            def redirect_to_frontend(full_path: str):
                if full_path.startswith("api/"):
                    raise HTTPException(status_code=404, detail="API route not found")
                return RedirectResponse(f"{public_url}/{full_path}")

        return
    if hasattr(application, "frontend"):
        # FastAPI's frontend helper serves static build output after API routes,
        # with SPA fallback behavior for Angular client-side routing.
        application.frontend("/", directory=str(frontend_dist), fallback="index.html")
        return

    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        application.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @application.get("/", include_in_schema=False)
    def serve_frontend_root():
        return FileResponse(frontend_dist / "index.html")

    @application.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str):
        requested = frontend_dist / full_path
        if requested.exists() and requested.is_file():
            return FileResponse(requested)
        return FileResponse(frontend_dist / "index.html")


app = create_app()


def main() -> None:
    uvicorn.run("app.main:app", host="0.0.0.0", port=int(sys.getenv("PORT") or 8080), reload=True)


if __name__ == "__main__":
    main()
