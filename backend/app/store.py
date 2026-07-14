import threading
import uuid
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, sessionmaker

from .database import Base, engine, SessionLocal, settings
from .models import AuditLog, Campaign, DuplicateCandidate, FamilyRelation, FormDefinition, HomeContent, Household, MedicalHistory, Person, User, Zone
from .schemas import CampaignStatus, Role, ValidationStatus, now_iso
from .security import hash_password


MODEL_BY_COLLECTION = {
    "users": User,
    "zones": Zone,
    "campaigns": Campaign,
    "households": Household,
    "persons": Person,
    "family_relations": FamilyRelation,
    "medical_histories": MedicalHistory,
    "form_definitions": FormDefinition,
    "audit_logs": AuditLog,
    "duplicate_candidates": DuplicateCandidate,
    "home_content": HomeContent,
}

COLLECTION_ORDER = (
    "users",
    "zones",
    "campaigns",
    "households",
    "persons",
    "family_relations",
    "medical_histories",
    "form_definitions",
    "audit_logs",
    "duplicate_candidates",
    "home_content",
)


class OrmStore:
    def __init__(self, session_factory: sessionmaker[Session] = SessionLocal):
        self.session_factory = session_factory
        self.lock = threading.Lock()
        if settings.auto_migrate:
            Base.metadata.create_all(bind=engine)
        self._ensure_seed()

    def all(self) -> dict[str, Any]:
        with self.lock:
            with self.session_factory() as session:
                return {
                    collection: [row.to_dict() for row in session.scalars(select(model)).all()]
                    for collection, model in MODEL_BY_COLLECTION.items()
                }

    def save(self, data: dict[str, Any]) -> dict[str, Any]:
        with self.lock:
            with self.session_factory.begin() as session:
                for collection in reversed(COLLECTION_ORDER):
                    session.execute(delete(MODEL_BY_COLLECTION[collection]))
                for collection in COLLECTION_ORDER:
                    model = MODEL_BY_COLLECTION[collection]
                    for item in data.get(collection, []):
                        session.add(model(**_clean_payload(model, item)))
            return data

    def collection(self, name: str) -> list[dict[str, Any]]:
        return self.all().setdefault(name, [])

    def _ensure_seed(self) -> None:
        with self.session_factory.begin() as session:
            has_users = session.scalar(select(User.id).limit(1))
            if has_users:
                self._ensure_home_content(session)
                return
            data = seed_data()
            for collection in COLLECTION_ORDER:
                model = MODEL_BY_COLLECTION[collection]
                for item in data.get(collection, []):
                    session.add(model(**_clean_payload(model, item)))
            self._ensure_home_content(session)

    def _ensure_home_content(self, session: Session) -> None:
        session.execute(delete(HomeContent))
        session.add(HomeContent(**_clean_payload(HomeContent, default_home_content())))


def _clean_payload(model: type, payload: dict[str, Any]) -> dict[str, Any]:
    fields = set(model.dict_fields)
    cleaned = {key: _scalar(value) for key, value in payload.items() if key in fields}
    if model is HomeContent and isinstance(cleaned.get("brand"), dict):
        cleaned["brand"] = _localized_scalar(cleaned["brand"])
    return cleaned


def _scalar(value: Any) -> Any:
    if hasattr(value, "value"):
        return value.value
    return value


def _localized_scalar(value: dict[str, Any]) -> str:
    return str(value.get("fr") or value.get("en") or next((item for item in value.values() if item), ""))


def seed_data() -> dict[str, Any]:
    admin_id = _id()
    supervisor_id = _id()
    agent_id = _id()
    campaign_id = _id()
    country_id = _id()
    region_id = _id()
    district_id = _id()
    household_id = _id()
    person_id = _id()
    spouse_id = _id()
    child_id = _id()
    grandparent_id = _id()
    now = now_iso()
    return {
        "users": [
            {
                "id": admin_id,
                "username": "admin",
                "full_name": "Admin National",
                "role": Role.ADMIN.value,
                "password_hash": hash_password("admin123"),
                "active": True,
                "zone_ids": [country_id, region_id, district_id],
            },
            {
                "id": supervisor_id,
                "username": "superviseur",
                "full_name": "Amina Diop",
                "role": Role.SUPERVISOR.value,
                "password_hash": hash_password("demo123"),
                "active": True,
                "zone_ids": [region_id, district_id],
            },
            {
                "id": agent_id,
                "username": "agent",
                "full_name": "Kossi Akakpo",
                "role": Role.AGENT.value,
                "password_hash": hash_password("demo123"),
                "active": True,
                "zone_ids": [district_id],
            },
        ],
        "zones": [
            {
                "id": country_id,
                "name": "Pays pilote",
                "code": "PIL",
                "type": "COUNTRY",
                "parent_id": None,
                "status": "ACTIVE",
                "progress": 100,
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            },
            {
                "id": region_id,
                "name": "Zone Nord",
                "code": "NORD",
                "type": "REGION",
                "parent_id": country_id,
                "status": "ACTIVE",
                "progress": 92,
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            },
            {
                "id": district_id,
                "name": "District Centre",
                "code": "CTR-01",
                "type": "DISTRICT",
                "parent_id": region_id,
                "status": "ACTIVE",
                "progress": 68,
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            },
        ],
        "campaigns": [
            {
                "id": campaign_id,
                "name": "Recensement National 2026",
                "status": CampaignStatus.ACTIVE.value,
                "start_date": "2026-07-01",
                "end_date": "2026-12-31",
                "zone_ids": [country_id, region_id, district_id],
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            }
        ],
        "households": [
            {
                "id": household_id,
                "local_id": "local-hh-001",
                "household_code": "HH-8492",
                "campaign_id": campaign_id,
                "zone_id": district_id,
                "head_person_id": person_id,
                "address_text": "Quartier central, concession 12",
                "gps_latitude": 6.1319,
                "gps_longitude": 1.2228,
                "housing_type": "Maison familiale",
                "occupancy_status": "Occupé",
                "member_count": 4,
                "observation": None,
                "validation_status": ValidationStatus.SUBMITTED.value,
                "sync_status": "SYNCED",
                "decision_comment": None,
                "created_by": agent_id,
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            }
        ],
        "persons": [
            {
                "id": person_id,
                "local_id": "local-person-001",
                "household_id": household_id,
                "campaign_id": campaign_id,
                "zone_id": district_id,
                "first_name": "Ama",
                "last_name": "Mensah",
                "other_names": None,
                "nickname": None,
                "gender": "F",
                "birth_date": "1988-04-12",
                "birth_date_estimated": False,
                "estimated_age": None,
                "birth_place": "Lomé",
                "nationality": "Togolaise",
                "primary_language": "Ewe",
                "marital_status": "Mariée",
                "occupation": "Commerçante",
                "education_level": "Secondaire",
                "phone": "+22890000000",
                "is_without_document": True,
                "data_source_type": "DECLARATION",
                "validation_status": ValidationStatus.SUBMITTED.value,
                "sync_status": "SYNCED",
                "decision_comment": None,
                "created_by": agent_id,
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            },
            {
                "id": spouse_id,
                "local_id": "local-person-002",
                "household_id": household_id,
                "campaign_id": campaign_id,
                "zone_id": district_id,
                "first_name": "Kojo",
                "last_name": "Mensah",
                "other_names": None,
                "nickname": None,
                "gender": "M",
                "birth_date": "1985-09-20",
                "birth_date_estimated": False,
                "estimated_age": None,
                "birth_place": "Kpalimé",
                "nationality": "Togolaise",
                "primary_language": "Ewe",
                "marital_status": "Marié",
                "occupation": "Agriculteur",
                "education_level": "Primaire",
                "phone": "+22890000001",
                "is_without_document": False,
                "data_source_type": "DECLARATION",
                "validation_status": ValidationStatus.SUBMITTED.value,
                "sync_status": "SYNCED",
                "decision_comment": None,
                "created_by": agent_id,
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            },
            {
                "id": child_id,
                "local_id": "local-person-003",
                "household_id": household_id,
                "campaign_id": campaign_id,
                "zone_id": district_id,
                "first_name": "Afi",
                "last_name": "Mensah",
                "other_names": None,
                "nickname": None,
                "gender": "F",
                "birth_date": "2014-02-03",
                "birth_date_estimated": False,
                "estimated_age": None,
                "birth_place": "Lomé",
                "nationality": "Togolaise",
                "primary_language": "Ewe",
                "marital_status": "Célibataire",
                "occupation": "Élève",
                "education_level": "Primaire",
                "phone": None,
                "is_without_document": True,
                "data_source_type": "DECLARATION_PARENT",
                "validation_status": ValidationStatus.SUBMITTED.value,
                "sync_status": "SYNCED",
                "decision_comment": None,
                "created_by": agent_id,
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            },
            {
                "id": grandparent_id,
                "local_id": "local-person-004",
                "household_id": household_id,
                "campaign_id": campaign_id,
                "zone_id": district_id,
                "first_name": "Yao",
                "last_name": "Mensah",
                "other_names": None,
                "nickname": "Papavi",
                "gender": "M",
                "birth_date": "1958-11-10",
                "birth_date_estimated": True,
                "estimated_age": 68,
                "birth_place": "Kpalimé",
                "nationality": "Togolaise",
                "primary_language": "Ewe",
                "marital_status": "Veuf",
                "occupation": "Retraité",
                "education_level": "Primaire",
                "phone": None,
                "is_without_document": False,
                "data_source_type": "DECLARATION",
                "validation_status": ValidationStatus.SUBMITTED.value,
                "sync_status": "SYNCED",
                "decision_comment": None,
                "created_by": agent_id,
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            },
        ],
        "family_relations": [
            {
                "id": _id(),
                "local_id": "local-rel-001",
                "campaign_id": campaign_id,
                "zone_id": district_id,
                "source_person_id": person_id,
                "target_person_id": spouse_id,
                "relation_type": "CONJOINT_DE",
                "evidence_type": "DECLARATION",
                "source_type": "AGENT",
                "validation_status": ValidationStatus.SUBMITTED.value,
                "sync_status": "SYNCED",
                "start_date": None,
                "end_date": None,
                "comment": "Déclaration du ménage",
                "decision_comment": None,
                "created_by": agent_id,
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            },
            {
                "id": _id(),
                "local_id": "local-rel-002",
                "campaign_id": campaign_id,
                "zone_id": district_id,
                "source_person_id": person_id,
                "target_person_id": child_id,
                "relation_type": "MERE_DE",
                "evidence_type": "DECLARATION",
                "source_type": "AGENT",
                "validation_status": ValidationStatus.SUBMITTED.value,
                "sync_status": "SYNCED",
                "start_date": None,
                "end_date": None,
                "comment": "Lien mère-enfant",
                "decision_comment": None,
                "created_by": agent_id,
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            },
            {
                "id": _id(),
                "local_id": "local-rel-003",
                "campaign_id": campaign_id,
                "zone_id": district_id,
                "source_person_id": spouse_id,
                "target_person_id": child_id,
                "relation_type": "PERE_DE",
                "evidence_type": "DECLARATION",
                "source_type": "AGENT",
                "validation_status": ValidationStatus.SUBMITTED.value,
                "sync_status": "SYNCED",
                "start_date": None,
                "end_date": None,
                "comment": "Lien père-enfant",
                "decision_comment": None,
                "created_by": agent_id,
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            },
            {
                "id": _id(),
                "local_id": "local-rel-004",
                "campaign_id": campaign_id,
                "zone_id": district_id,
                "source_person_id": grandparent_id,
                "target_person_id": spouse_id,
                "relation_type": "PERE_DE",
                "evidence_type": "DECLARATION",
                "source_type": "AGENT",
                "validation_status": ValidationStatus.SUBMITTED.value,
                "sync_status": "SYNCED",
                "start_date": None,
                "end_date": None,
                "comment": "Lien père-enfant (grand-père de la famille)",
                "decision_comment": None,
                "created_by": agent_id,
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            },
        ],
        "medical_histories": [
            {
                "id": _id(),
                "local_id": "local-med-001",
                "person_id": person_id,
                "campaign_id": campaign_id,
                "zone_id": district_id,
                "condition_name": "Hypertension artérielle",
                "condition_code": "I10",
                "category": "CARDIOVASCULAR",
                "diagnosis_age": 34,
                "diagnosis_date": "2022-08-01",
                "severity": "MODERATE",
                "status": "ACTIVE",
                "hereditary_risk": True,
                "notes": "Traitement régulier déclaré pendant la collecte.",
                "validation_status": ValidationStatus.SUBMITTED.value,
                "sync_status": "SYNCED",
                "decision_comment": None,
                "created_by": agent_id,
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            },
            {
                "id": _id(),
                "local_id": "local-med-002",
                "person_id": spouse_id,
                "campaign_id": campaign_id,
                "zone_id": district_id,
                "condition_name": "Diabète de type 2",
                "condition_code": "E11",
                "category": "METABOLIC",
                "diagnosis_age": 38,
                "diagnosis_date": "2023-03-15",
                "severity": "MODERATE",
                "status": "MONITORED",
                "hereditary_risk": True,
                "notes": "Antécédent familial rapporté.",
                "validation_status": ValidationStatus.SUBMITTED.value,
                "sync_status": "SYNCED",
                "decision_comment": None,
                "created_by": agent_id,
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            },
        ],
        "form_definitions": [
            {
                "id": "household-demographics",
                "title": {"fr": "Démographie du ménage 2026", "en": "Household Demographics 2026"},
                "description": {
                    "fr": "Veuillez collecter les détails concernant le décideur principal du ménage.",
                    "en": "Please collect details regarding the primary decision maker of the household.",
                },
                "fields": [
                    {"label": {"fr": "Nom complet du répondant", "en": "Full Name of Respondent"}, "type": "short_text", "required": True},
                    {"label": {"fr": "Date de naissance", "en": "Date of Birth"}, "type": "date", "required": True},
                ],
                "status": "DRAFT",
                "version": 1,
                "created_by": admin_id,
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            }
        ],
        "audit_logs": [],
        "duplicate_candidates": [],
        "home_content": [],
    }


def default_home_content() -> dict[str, Any]:
    now = now_iso()
    content = {
        "id": "public-home",
        "brand": "AfriCensus Link",
        "nav_links": [
            {"label": "Solution", "href": "#solution"},
            {"label": "Impact", "href": "#impact"},
            {"label": "Support", "href": "#support"},
        ],
        "actions": [
            {"label": "Accès Agent", "href": "/login", "style": "secondary"},
            {"label": "Portail Superviseur", "href": "/dashboard", "style": "primary"},
        ],
        "hero": {
            "badge": "Certification de Sécurité Nationale",
            "title": "Le Futur du Recensement Numérique en Afrique",
            "subtitle": "Une plateforme résiliente conçue pour la collecte de données fiables, même dans les zones les plus reculées. Précision, sécurité et analyse en temps réel pour le développement du continent.",
            "image_url": "https://lh3.googleusercontent.com/aida-public/AB6AXuBkEyk2y_EuSE88mqJsQEfIuVaSidWe51IuW2wKt7n3ifzBfaYB8-GNKupyrFoQxC8wKTSc8dA_SKk2j2eojNt6TL-hN3vxAQQZ5G5CCexNt9-Y9ZIofYsKb2LK6CcX9UFFR_G4_7HIEjKY0iVGzzJZcotovAzIYMjVzJLUK0fEvVUnU3FRETTQ7_3qcUTzNQZZs_qjqiX-D7rHvICIbFcZHjxwk4KAsvFQgBzESaHBQDhS8efNFKb-IufH-eKLpDii-2z3UHNr0zA",
            "image_alt": "Ville africaine moderne avec agent de recensement utilisant une tablette",
            "actions": [
                {"label": "Portail Superviseur", "href": "/dashboard", "icon": "layout-dashboard", "style": "primary"},
                {"label": "Accès Agent", "href": "/login", "icon": "smartphone", "style": "secondary"},
            ],
        },
        "metrics": [
            {"value": "25M+", "label": "Données traitées", "tone": "primary"},
            {"value": "100%", "label": "Couverture Nationale", "tone": "primary"},
            {"value": "ZERO", "label": "Support Papier", "tone": "earth"},
        ],
        "values": [
            {"icon": "map-pin", "title": "Précision Terrain", "text": "Collecte hors-ligne synchronisée automatiquement avec cartographie GPS intégrée."},
            {"icon": "chart-line", "title": "Analyse Temps Réel", "text": "Tableaux de bord interactifs pour suivre les zones et valider les enquêtes en direct."},
            {"icon": "lock", "title": "Sécurité Totale", "text": "Chiffrement, contrôle des rôles et traçabilité des actions sensibles."},
        ],
        "sections": [
            {
                "id": "solution",
                "eyebrow": "Administration centrale",
                "title": "Portail Web Superviseur",
                "text": "Une tour de contrôle pour gérer les zones, assigner les agents, vérifier la qualité et suivre l’avancement en direct.",
                "bullets": ["Suivi des quotas par district", "Validation multicanale", "Rapports automatisés"],
                "visual": "dashboard",
                "tone": "primary",
            },
            {
                "id": "mobile",
                "eyebrow": "Unités de terrain",
                "title": "Application Mobile Agent",
                "text": "Interface intuitive, support hors ligne et saisie guidée pour minimiser les erreurs pendant les entretiens.",
                "bullets": ["Mode hors ligne haute performance", "Navigation assistée par GPS", "Multi-langues et supports audio"],
                "visual": "phone",
                "tone": "earth",
            },
        ],
        "footer": {
            "title": "AfriCensus Link",
            "text": "Plateforme panafricaine de collecte de données statistiques pour le développement durable.",
            "contact": "contact@africensuslink.org\nHub Technologique, Dakar, Sénégal\n+221 33 000 00 00",
        },
        "published": True,
        "created_by": None,
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
    }
    return localize_home_content(content)


DEFAULT_EN_TRANSLATIONS = {
    "Solution": "Solution",
    "Impact": "Impact",
    "Support": "Support",
    "Accès Agent": "Agent Access",
    "Portail Superviseur": "Supervisor Portal",
    "Certification de Sécurité Nationale": "National Security Certification",
    "Le Futur du Recensement Numérique en Afrique": "The Future of Digital Census in Africa",
    "Une plateforme résiliente conçue pour la collecte de données fiables, même dans les zones les plus reculées. Précision, sécurité et analyse en temps réel pour le développement du continent.": "A resilient platform designed for reliable data collection, even in the most remote areas. Accuracy, security and real-time analytics for the continent's development.",
    "Ville africaine moderne avec agent de recensement utilisant une tablette": "Modern African city with a census agent using a tablet",
    "Données traitées": "Processed records",
    "Couverture Nationale": "National Coverage",
    "Support Papier": "Paper Support",
    "Précision Terrain": "Field Accuracy",
    "Collecte hors-ligne synchronisée automatiquement avec cartographie GPS intégrée.": "Offline collection automatically synchronized with built-in GPS mapping.",
    "Analyse Temps Réel": "Real-Time Analytics",
    "Tableaux de bord interactifs pour suivre les zones et valider les enquêtes en direct.": "Interactive dashboards to monitor zones and validate surveys live.",
    "Sécurité Totale": "Full Security",
    "Chiffrement, contrôle des rôles et traçabilité des actions sensibles.": "Encryption, role controls and traceability for sensitive actions.",
    "Administration centrale": "Central Administration",
    "Portail Web Superviseur": "Supervisor Web Portal",
    "Une tour de contrôle pour gérer les zones, assigner les agents, vérifier la qualité et suivre l’avancement en direct.": "A control tower to manage zones, assign agents, check quality and monitor progress live.",
    "Suivi des quotas par district": "Quota tracking by district",
    "Validation multicanale": "Multi-channel validation",
    "Rapports automatisés": "Automated reports",
    "Unités de terrain": "Field Units",
    "Application Mobile Agent": "Field Agent Mobile App",
    "Interface intuitive, support hors ligne et saisie guidée pour minimiser les erreurs pendant les entretiens.": "Intuitive interface, offline support and guided entry to reduce errors during interviews.",
    "Mode hors ligne haute performance": "High-performance offline mode",
    "Navigation assistée par GPS": "GPS-assisted navigation",
    "Multi-langues et supports audio": "Multilingual and audio support",
    "Plateforme panafricaine de collecte de données statistiques pour le développement durable.": "Pan-African statistical data collection platform for sustainable development.",
    "contact@africensuslink.org\nHub Technologique, Dakar, Sénégal\n+221 33 000 00 00": "contact@africensuslink.org\nTechnology Hub, Dakar, Senegal\n+221 33 000 00 00",
}


def localize_home_content(content: dict[str, Any]) -> dict[str, Any]:
    localized = dict(content)
    localized["brand"] = content["brand"]
    localized["nav_links"] = [localize_link(item) for item in content["nav_links"]]
    localized["actions"] = [localize_link(item) for item in content["actions"]]
    localized["hero"] = localize_hero(content["hero"])
    localized["metrics"] = [
        {**item, "value": localized_text(item["value"]), "label": localized_text(item["label"])}
        for item in content["metrics"]
    ]
    localized["values"] = [
        {**item, "title": localized_text(item["title"]), "text": localized_text(item["text"])}
        for item in content["values"]
    ]
    localized["sections"] = [
        {
            **item,
            "eyebrow": localized_text(item["eyebrow"]),
            "title": localized_text(item["title"]),
            "text": localized_text(item["text"]),
            "bullets": [localized_text(bullet) for bullet in item["bullets"]],
        }
        for item in content["sections"]
    ]
    localized["footer"] = {
        **content["footer"],
        "title": localized_text(content["footer"]["title"]),
        "text": localized_text(content["footer"]["text"]),
        "contact": localized_text(content["footer"]["contact"]),
    }
    return localized


def localize_link(item: dict[str, Any]) -> dict[str, Any]:
    return {**item, "label": localized_text(item["label"])}


def localize_hero(hero: dict[str, Any]) -> dict[str, Any]:
    return {
        **hero,
        "badge": localized_text(hero["badge"]),
        "title": localized_text(hero["title"]),
        "subtitle": localized_text(hero["subtitle"]),
        "image_alt": localized_text(hero["image_alt"]) if hero.get("image_alt") else None,
        "actions": [localize_link(item) for item in hero["actions"]],
    }


def localized_text(value: str) -> dict[str, str]:
    return {"fr": value, "en": DEFAULT_EN_TRANSLATIONS.get(value, value)}


def _id() -> str:
    return str(uuid.uuid4())
