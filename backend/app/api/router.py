from fastapi import APIRouter

from .routes import audit, auth, campaigns, dashboard, forms, health, home_content, households, i18n, medical, persons, relations, reports, sync, users, validation, zones


api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(i18n.router)
api_router.include_router(home_content.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(dashboard.router)
api_router.include_router(zones.router)
api_router.include_router(campaigns.router)
api_router.include_router(forms.router)
api_router.include_router(households.router)
api_router.include_router(persons.router)
api_router.include_router(relations.router)
api_router.include_router(medical.router)
api_router.include_router(validation.router)
api_router.include_router(sync.router)
api_router.include_router(reports.router)
api_router.include_router(audit.router)
