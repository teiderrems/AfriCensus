import logging
from typing import Any
from sqlalchemy.orm import Session

from .database import engine, Base
from .models import (
    User, AppRole, Zone, Campaign, HomeContent, FormDefinition,
    Household, Person, FamilyRelation, MedicalHistory, AuditLog, DuplicateCandidate,
    ChatMessage, ChatGroup, ChatGroupMember, SystemSetting, FaqItem
)
from .security import hash_password

logger = logging.getLogger(__name__)

def init_admin(db: Session) -> None:
    """Ensure the default administrator and system roles exist."""
    try:
        from .api.routes.roles import _ensure_default_roles
        _ensure_default_roles(db)
        
        admin_uname = "admin"
        admin = db.query(User).filter(User.username == admin_uname).first()
        if not admin:
            db.add(User(
                id="user-admin-1", username=admin_uname, full_name="Administrateur National",
                role="ADMIN", password_hash=hash_password("admin123"), active=True, zone_ids=[], disabled_features=[]
            ))
            db.commit()
            logger.info("Default admin user created.")
    except Exception as e:
        logger.error(f"Error creating default admin: {e}")
        db.rollback()


def init_db(db: Session) -> None:
    """Ensure database tables exist and seed default records (~50 per entity, 10-level family tree)."""
    # Base.metadata.create_all(bind=engine) is handled by Alembic migrations

    # 0. Seed System Settings (Branding, Features, Global Settings)
    try:
        from .schemas import AppBrandingIn, AppSettingsIn, AppFeaturesIn
        settings_to_seed = {
            "app.branding": AppBrandingIn(
                app_name="AfriCensus Link",
                primary_color="#0284c7",
                secondary_color="#10b981",
                primary_color_dark="#38bdf8",
                secondary_color_dark="#34d399",
                font_family="Inter, Arial, sans-serif",
                base_font_size="14px",
                card_radius="16px",
                button_radius="8px",
                sidebar_bg="",
                sidebar_text="",
                logo_url="assets/logo.png",
                favicon_url=None,
                login_heading=None,
                login_subheading=None,
                default_theme="light"
            ).model_dump(),
            "app.settings": AppSettingsIn(
                default_locale="fr",
                timezone="Africa/Abidjan",
                date_format="DD/MM/YYYY",
                max_household_size=30,
                strict_collection_window=False
            ).model_dump(),
            "app.features": AppFeaturesIn(
                messaging=True,
                family_tree=True,
                medical_history=True,
                duplicates=True,
                custom_forms=False,
                csv_export=False
            ).model_dump(),
            "app.help": {
                "quick_guide": {
                    "fr": "Bienvenue sur AfriCensus Link. Cette application vous permet de recenser et de valider les informations de la population. Utilisez la barre de navigation sur votre gauche pour accéder aux différents modules selon votre rôle.",
                    "en": "Welcome to AfriCensus Link. This application allows you to enumerate and validate population information. Use the navigation bar on your left to access different modules based on your role."
                },
                "contact_email": "support@africensus.local",
                "contact_phone": "+123 456 789 000"
            }
        }
        for key, value in settings_to_seed.items():
            if not db.query(SystemSetting).filter(SystemSetting.key == key).first():
                db.add(SystemSetting(key=key, value_json=value))
        db.commit()
        logger.info("System settings seeded.")
    except Exception as e:
        logger.error(f"Error seeding system settings: {e}")
        db.rollback()

    # 0.5 Seed FAQs
    try:
        if db.query(FaqItem).count() == 0:
            faqs = [
                FaqItem(
                    id="faq-1",
                    category={"fr": "Général", "en": "General"},
                    question={"fr": "Comment réinitialiser mon mot de passe ?", "en": "How to reset my password?"},
                    answer={"fr": "Cliquez sur 'Mot de passe oublié' sur la page de connexion, puis suivez les instructions envoyées par e-mail.", "en": "Click on 'Forgot password' on the login page, then follow the instructions sent by email."},
                    order=1,
                    is_active=True
                ),
                FaqItem(
                    id="faq-2",
                    category={"fr": "Synchronisation", "en": "Synchronization"},
                    question={"fr": "Que faire si la synchronisation échoue ?", "en": "What if synchronization fails?"},
                    answer={"fr": "Vérifiez votre connexion internet. L'application mettra les données en cache et réessaiera automatiquement dès que la connexion sera rétablie.", "en": "Check your internet connection. The app will cache the data and automatically retry once the connection is restored."},
                    order=2,
                    is_active=True
                )
            ]
            db.add_all(faqs)
            db.commit()
            logger.info("FAQs seeded.")
    except Exception as e:
        logger.error(f"Error seeding FAQs: {e}")
        db.rollback()

    # 1. Seed HomeContent
    try:
        full_home_data = {
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
                {"id": "m2", "value": {"fr": "50M+", "en": "50M+"}, "label": {"fr": "Citoyens Recensés", "en": "Registered Citizens"}, "tone": "earth"},
                {"id": "m3", "value": {"fr": "10 000+", "en": "10,000+"}, "label": {"fr": "Agents de Terrain", "en": "Field Enumerators"}, "tone": "primary"},
                {"id": "m4", "value": {"fr": "99.9%", "en": "99.9%"}, "label": {"fr": "Disponibilité & Sécurité", "en": "Security & Uptime"}, "tone": "earth"}
            ],
            "values": [
                {
                    "icon": "shield-check",
                    "title": {"fr": "Sécurité & Confidentialité", "en": "Security & Confidentiality"},
                    "text": {"fr": "Protection stricte des données à caractère personnel conformément aux normes souveraines.", "en": "Strict personal data protection according to sovereign standards."}
                },
                {
                    "icon": "wifi-off",
                    "title": {"fr": "Mode Hors-Ligne Interopérable", "en": "Offline-First Collection"},
                    "text": {"fr": "Collecte continue sur le terrain sans connexion internet avec synchronisation automatique.", "en": "Continuous offline field collection with automatic sync when connected."}
                },
                {
                    "icon": "chart-bar",
                    "title": {"fr": "Analytique en Temps Réel", "en": "Real-Time Analytics"},
                    "text": {"fr": "Tableaux de bord dynamiques et indicateurs de suivi pour les décideurs nationaux.", "en": "Dynamic dashboards and tracking indicators for national decision-makers."}
                },
                {
                    "icon": "users",
                    "title": {"fr": "Arbres Généalogiques & Ménages", "en": "Family Trees & Households"},
                    "text": {"fr": "Gestion structurée des ménages et liens de parenté pour une meilleure cartographie sociale.", "en": "Structured household management and family ties for precise social mapping."}
                }
            ],
            "sections": [
                {
                    "id": "sec-mobile",
                    "eyebrow": {"fr": "APPLICATION MOBILE TERRAIN", "en": "FIELD MOBILE APP"},
                    "title": {"fr": "Collecte terrain rapide et sécurisée", "en": "Fast and Secure Field Collection"},
                    "text": {"fr": "L'application mobile permet aux agents de recenser les ménages, de valider les coordonnées géographiques et de saisir les antécédents médicaux sans interruption.", "en": "The mobile app allows agents to census households, validate coordinates, and capture medical histories seamlessly."},
                    "bullets": [
                        {"fr": "Interface ergonomique et réactive", "en": "Ergonomic and responsive interface"},
                        {"fr": "Validation des données à la source", "en": "Source-level data validation"},
                        {"fr": "Chiffrement local de bout en bout", "en": "End-to-end local encryption"}
                    ],
                    "visual": "phone",
                    "tone": "primary"
                },
                {
                    "id": "sec-supervision",
                    "eyebrow": {"fr": "SUPERVISION & GOUVERNANCE", "en": "SUPERVISION & GOVERNANCE"},
                    "title": {"fr": "Pilotage géographique et cartographie avancée", "en": "Geographic Steering & Advanced Mapping"},
                    "text": {"fr": "Les superviseurs et statisticiens contrôlent la qualité des données, détectent les doublons et génèrent les rapports officiels de la campagne.", "en": "Supervisors and statisticians control data quality, detect duplicates, and generate official campaign reports."},
                    "bullets": [
                        {"fr": "Suivi de progression par zone territoriale", "en": "Progress tracking by territorial zone"},
                        {"fr": "Algorithme intelligent de résolution des doublons", "en": "Smart duplicate resolution algorithm"},
                        {"fr": "Rapports agrégés téléchargeables en PDF et Excel", "en": "Aggregated PDF & Excel downloadable reports"}
                    ],
                    "visual": "dashboard",
                    "tone": "earth"
                }
            ],
            "footer": {
                "title": {"fr": "AfriCensus Link", "en": "AfriCensus Link"},
                "text": {"fr": "Plateforme institutionnelle nationale de collecte et de gestion des données démographiques.", "en": "National institutional platform for demographic data collection and management."},
                "contact": {"fr": "Direction Nationale du Recensement\nEmail : contact@africensus.org\nTél : +243 800 000 000", "en": "National Census Directorate\nEmail: contact@africensus.org\nPhone: +243 800 000 000"}
            },
            "published": True
        }

        existing_home = db.query(HomeContent).filter(HomeContent.deleted_at.is_(None)).first()
        if not existing_home:
            default_home_content = HomeContent(
                **full_home_data,
                created_by="system",
                created_at="2026-01-01T00:00:00Z",
                updated_at="2026-01-01T00:00:00Z"
            )
            db.add(default_home_content)
        else:
            existing_home.brand = full_home_data["brand"]
            existing_home.nav_links = full_home_data["nav_links"]
            existing_home.actions = full_home_data["actions"]
            existing_home.hero = full_home_data["hero"]
            existing_home.metrics = full_home_data["metrics"]
            existing_home.values = full_home_data["values"]
            existing_home.sections = full_home_data["sections"]
            existing_home.footer = full_home_data["footer"]
            existing_home.published = True
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(existing_home, "hero")
            flag_modified(existing_home, "metrics")
            flag_modified(existing_home, "values")
            flag_modified(existing_home, "sections")
            flag_modified(existing_home, "footer")
            flag_modified(existing_home, "nav_links")
            flag_modified(existing_home, "actions")
    except Exception as e:
        logger.error(f"Error seeding HomeContent: {e}")
        db.rollback()

    # 2. Seed Users (50 Users)
    try:
        # Initialize admin first
        init_admin(db)
        
        # Core required accounts
        core_users = [
            ("user-supervisor-1", "superviseur", "Superviseur Régional", "SUPERVISOR", "demo123", ["zone-seed-1"]),
            ("user-agent-1", "agent", "Agent Recenseur", "AGENT", "agent123", ["zone-seed-1"]),
            ("user-stat-1", "statisticien", "Statisticien National", "STATISTICIAN", "stat123", []),
            ("user-audit-1", "auditeur", "Auditeur Sécurité", "AUDITOR", "audit123", []),
        ]
        for uid, uname, fname, role, pwd, zids in core_users:
            u = db.query(User).filter(User.username == uname).first()
            if not u:
                db.add(User(
                    id=uid, username=uname, full_name=fname, role=role,
                    password_hash=hash_password(pwd), active=True, zone_ids=zids
                ))
            else:
                u.password_hash = hash_password(pwd)
                u.active = True

        existing_user_count = db.query(User).count()
        if existing_user_count < 50:
            # Generated additional users up to 50
            roles = ["AGENT", "SUPERVISOR", "STATISTICIAN", "AUDITOR"]
            for i in range(len(core_users) + 1, 51):
                uid = f"user-seed-{i}"
                uname = f"agent_region_{i}"
                if not db.query(User).filter(User.id == uid).first():
                    role = roles[(i - 1) % len(roles)]
                    db.add(User(
                        id=uid,
                        username=uname,
                        full_name=f"Agent Terrain {i}",
                        role=role,
                        password_hash=hash_password("password123"),
                        active=(i % 10 != 0),
                        zone_ids=[f"zone-seed-{(i % 10) + 1}"]
                    ))
    except Exception as e:
        logger.error(f"Error seeding Users: {e}")
        db.rollback()

    # 3. Seed Zones (50 Zones)
    try:
        zone_types = ["REGION", "PROVINCE", "DISTRICT", "URBAN", "RURAL", "PERIURBAN"]
        zone_names_fr = ["Région Capitale", "Province du Nord", "District du Sud", "Zone Urbaine Est", "Zone Rurale Ouest", "Région Côtière Centrale"]
        zone_names_en = ["Capital Region", "Northern Province", "Southern District", "Eastern Urban Area", "Western Rural Zone", "Central Coastal Region"]

        # Main root zone
        root_zone = db.query(Zone).filter(Zone.id == "zone-seed-1").first()
        if not root_zone:
            db.add(Zone(
                id="zone-seed-1",
                name={"fr": "Région Capitale", "en": "Capital Region"},
                code="REG-01", type="REGION",
                parent_id=None, status="ACTIVE", progress=85, created_by="user-admin-1",
                created_at="2026-01-01T00:00:00Z", updated_at="2026-01-01T00:00:00Z"
            ))

        if db.query(Zone).count() < 50:
            for i in range(2, 51):
                zid = f"zone-seed-{i}"
                if not db.query(Zone).filter(Zone.id == zid).first():
                    parent_id = f"zone-seed-{(i // 5) + 1}" if i > 5 else "zone-seed-1"
                    ztype = zone_types[(i - 1) % len(zone_types)]
                    fr_n = zone_names_fr[(i - 1) % len(zone_names_fr)] + f" {i}"
                    en_n = zone_names_en[(i - 1) % len(zone_names_en)] + f" {i}"
                    db.add(Zone(
                        id=zid,
                        name={"fr": fr_n, "en": en_n},
                        code=f"Z-{i:03d}",
                        type=ztype,
                        parent_id=parent_id,
                        status="ACTIVE" if i % 6 != 0 else "INACTIVE",
                        progress=(i * 2) % 100,
                        created_by="user-admin-1",
                        created_at="2026-01-01T00:00:00Z",
                        updated_at="2026-01-01T00:00:00Z"
                    ))

        # Migration: Ensure all existing Zone names are FR/EN dicts
        for z in db.query(Zone).all():
            if isinstance(z.name, str):
                z.name = {"fr": z.name, "en": z.name}
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(z, "name")
        db.commit()
    except Exception as e:
        logger.error(f"Error seeding Zones: {e}")
        db.rollback()

    # 4. Seed Campaigns (50 Campaigns)
    try:
        statuses = ["ACTIVE", "COMPLETED", "DRAFT", "ARCHIVED"]
        if db.query(Campaign).count() < 50:
            for i in range(1, 51):
                cid = f"camp-seed-{i}"
                if not db.query(Campaign).filter(Campaign.id == cid).first():
                    status = statuses[(i - 1) % len(statuses)]
                    year = 2020 + (i % 7)
                    db.add(Campaign(
                        id=cid,
                        name={
                            "fr": f"Campagne Démographique {year} - Phase {i}",
                            "en": f"Demographic Campaign {year} - Phase {i}"
                        },
                        status=status,
                        start_date=f"{year}-01-15",
                        end_date=f"{year}-12-15",
                        zone_ids=[f"zone-seed-{(i % 10) + 1}"],
                        created_by="user-admin-1",
                        created_at="2026-01-01T00:00:00Z",
                        updated_at="2026-01-01T00:00:00Z"
                    ))

        # Migration: Ensure all existing Campaign names are FR/EN dicts
        for c in db.query(Campaign).all():
            if isinstance(c.name, str):
                c.name = {"fr": c.name, "en": c.name}
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(c, "name")
        db.commit()
    except Exception as e:
        logger.error(f"Error seeding Campaigns: {e}")
        db.rollback()

    # 5. Seed Households (50 Households)
    try:
        if db.query(Household).count() < 50:
            housing_types = ["SINGLE_FAMILY", "APARTMENT", "TRADITIONAL", "COMPOUND", "OTHER"]
            occupancies = ["OWNER", "TENANT", "FREE_HOUSING", "OTHER"]
            val_statuses = ["VALIDATED", "SUBMITTED", "NEEDS_CORRECTION", "DRAFT"]
            for i in range(1, 51):
                hid = f"hh-seed-{i}"
                if not db.query(Household).filter(Household.id == hid).first():
                    db.add(Household(
                        id=hid,
                        household_code=f"HH-{i:04d}",
                        campaign_id=f"camp-seed-{(i % 10) + 1}",
                        zone_id=f"zone-seed-{(i % 10) + 1}",
                        address_text=f"{i * 12} Avenue de l'Indépendance, Secteur {i}",
                        gps_latitude=5.34531 + (i * 0.001),
                        gps_longitude=-4.02442 + (i * 0.001),
                        housing_type=housing_types[(i - 1) % len(housing_types)],
                        occupancy_status=occupancies[(i - 1) % len(occupancies)],
                        member_count=(i % 6) + 1,
                        observation=f"Observation de terrain pour le ménage {i}. Ras.",
                        validation_status=val_statuses[(i - 1) % len(val_statuses)],
                        sync_status="SYNCED" if i % 2 == 0 else "PENDING",
                        decision_comment="Validé par le superviseur régional." if i % 3 == 0 else None,
                        created_by="user-admin-1",
                        created_at="2026-01-01T00:00:00Z",
                        updated_at="2026-01-01T00:00:00Z"
                    ))
    except Exception as e:
        logger.error(f"Error seeding Households: {e}")
        db.rollback()

    # 6. Seed Persons (including 10-Generation Lineage & Total 55+ Persons)
    try:
        if db.query(Person).count() < 50:
            val_statuses = ["VALIDATED", "SUBMITTED", "NEEDS_CORRECTION", "DRAFT"]
            
            # --- 6A. Rich Multi-Generational Family Tree (Spouses & Parents across 4+ Generations) ---
            deep_lineage = [
                # Gen 1
                ("person-deep-1", "Kabila", "Mwemba", "MALE", "1875-03-10", "Génération 1 (Patriarche Fondateur)"),
                ("person-deep-1-wife", "Mariam", "Mwemba", "FEMALE", "1878-06-15", "Génération 1 (Matriarche)"),
                
                # Gen 2
                ("person-deep-2", "Amadou", "Mwemba", "MALE", "1898-07-22", "Génération 2 (Fils de Kabila & Mariam)"),
                ("person-deep-2-wife", "Awa", "Diop", "FEMALE", "1902-11-04", "Génération 2 (Épouse d'Amadou)"),
                ("person-deep-2-sister", "Fatou", "Mwemba", "FEMALE", "1905-04-18", "Génération 2 (Fille de Kabila & Mariam)"),
                ("person-deep-2-husband", "Ibrahima", "Sow", "MALE", "1901-09-12", "Génération 2 (Époux de Fatou)"),

                # Gen 3
                ("person-deep-3", "Binta", "Mwemba", "FEMALE", "1922-11-05", "Génération 3 (Fille d'Amadou & Awa)"),
                ("person-deep-3-husband", "Moussa", "Keita", "MALE", "1918-02-28", "Génération 3 (Époux de Binta)"),
                ("person-deep-4", "Ousmane", "Mwemba", "MALE", "1926-02-14", "Génération 3 (Fils d'Amadou & Awa)"),
                ("person-deep-4-wife", "Khadija", "Traoré", "FEMALE", "1930-08-20", "Génération 3 (Épouse d'Ousmane)"),
                ("person-deep-3-cousin", "Sékou", "Sow", "MALE", "1928-12-10", "Génération 3 (Fils de Fatou & Ibrahima)"),

                # Gen 4
                ("person-deep-5", "Fatou", "Mwemba", "FEMALE", "1950-09-30", "Génération 4 (Fille d'Ousmane & Khadija)"),
                ("person-deep-5-husband", "Boubacar", "Diallo", "MALE", "1946-05-14", "Génération 4 (Époux de Fatou)"),
                ("person-deep-5-cousin", "Ibrahim", "Keita", "MALE", "1948-03-25", "Génération 4 (Fils de Binta & Moussa)"),

                # Gen 5 à 9
                ("person-deep-6", "Ibrahim", "Mwemba", "MALE", "1978-04-18", "Génération 5"),
                ("person-deep-6-wife", "Aminata", "Camara", "FEMALE", "1982-10-12", "Génération 5 (Épouse d'Ibrahim)"),
                ("person-deep-7", "Awa", "Mwemba", "FEMALE", "1998-12-01", "Génération 6"),
                ("person-deep-8", "Sékou", "Mwemba", "MALE", "2015-06-25", "Génération 7"),
                ("person-deep-9", "Mariam", "Mwemba", "FEMALE", "2023-01-10", "Génération 8"),
                ("person-deep-10", "Malick", "Mwemba", "MALE", "2025-08-05", "Génération 9"),
            ]
            for pid, fname, lname, gender, bdate, note in deep_lineage:
                if not db.query(Person).filter(Person.id == pid).first():
                    db.add(Person(
                        id=pid,
                        household_id="hh-seed-1",
                        campaign_id="camp-seed-1",
                        zone_id="zone-seed-1",
                        first_name=fname,
                        last_name=lname,
                        gender=gender,
                        birth_date=bdate,
                        birth_place="Capitale" if "18" in bdate else "Région Ouest",
                        nationality="National",
                        primary_language="Français",
                        marital_status="MARRIED" if "wife" in pid or "husband" in pid else "SINGLE",
                        occupation="Agriculteur" if "18" in bdate else "Commerçant",
                        education_level="PRIMARY" if "18" in bdate else "SECONDARY",
                        phone=f"+225 01 00 11 22 {pid[-1]}" if pid[-1].isdigit() else None,
                        residency_status="RESIDENT",
                        validation_status="VALIDATED",
                        sync_status="SYNCED",
                        created_by="user-admin-1",
                        created_at="2026-01-01T00:00:00Z",
                        updated_at="2026-01-01T00:00:00Z"
                    ))

            # --- 6B. General Enumerated Persons (45 additional) ---
            first_names_m = ["Kwame", "Kofi", "Moussa", "Tariq", "Zuberi", "Diallo", "Bakary", "Chidubem", "Femi", "Sipho"]
            first_names_f = ["Amina", "Zainab", "Nia", "Chioma", "Zuri", "Abeba", "Khadija", "Makena", "Titi", "Ayotunde"]
            last_names = ["Kone", "Traore", "Diop", "Okafor", "Sow", "Mensah", "Kamara", "Bamba", "Diallo", "Nkomo"]

            for i in range(1, 46):
                pid = f"person-seed-{i}"
                if not db.query(Person).filter(Person.id == pid).first():
                    is_male = (i % 2 == 0)
                    fname = first_names_m[i % len(first_names_m)] if is_male else first_names_f[i % len(first_names_f)]
                    lname = last_names[i % len(last_names)]
                    birth_year = 1945 + (i * 2) % 75
                    db.add(Person(
                        id=pid,
                        household_id=f"hh-seed-{(i % 50) + 1}",
                        campaign_id=f"camp-seed-{(i % 10) + 1}",
                        zone_id=f"zone-seed-{(i % 10) + 1}",
                        first_name=fname,
                        last_name=lname,
                        other_names=f"{fname[:3].upper()}" if i % 4 == 0 else None,
                        nickname=f"{fname[:2]}{lname[:2]}" if i % 3 == 0 else None,
                        gender="MALE" if is_male else "FEMALE",
                        birth_date=f"{birth_year}-{(i%12)+1:02d}-{(i%28)+1:02d}",
                        birth_date_estimated=(i % 5 == 0),
                        estimated_age=(2026 - birth_year) if i % 5 == 0 else None,
                        birth_place="Ville A" if i % 2 == 0 else "Ville B",
                        nationality="National" if i % 5 != 0 else "Foreigner",
                        primary_language="Français" if i % 2 == 0 else "Anglais",
                        marital_status="MARRIED" if i % 3 == 0 else "SINGLE",
                        occupation="Enseignant" if i % 4 == 0 else "Artisan",
                        education_level="UNIVERSITY" if i % 3 == 0 else "PRIMARY",
                        phone=f"+225 07 00 {i:02d} 11 22" if i % 2 == 0 else None,
                        residency_status="RESIDENT" if i % 4 != 0 else "TEMPORARY",
                        validation_status=val_statuses[(i - 1) % len(val_statuses)],
                        is_without_document=(i % 7 == 0),
                        data_source_type="FIELD_SURVEY",
                        sync_status="SYNCED",
                        decision_comment="Personne enquêtée le matin." if i % 4 == 0 else None,
                        created_by="user-admin-1",
                        created_at="2026-01-01T00:00:00Z",
                        updated_at="2026-01-01T00:00:00Z"
                    ))
    except Exception as e:
        logger.error(f"Error seeding Persons: {e}")
        db.rollback()

    # 7. Seed FamilyRelations (50+ Relations including 10-Generation Lineage)
    try:
        if db.query(FamilyRelation).count() < 50:
            # --- 7A. Multi-Generational Family Ties (Mari/Femme & Père/Mère/Enfant) ---
            rich_family_relations = [
                # Gen 1 Couples & Children
                ("rel-g1-spouse", "person-deep-1", "person-deep-1-wife", "CONJOINT_DE"),
                ("rel-g1-p1", "person-deep-1", "person-deep-2", "PERE_DE"),
                ("rel-g1-m1", "person-deep-1-wife", "person-deep-2", "MERE_DE"),
                ("rel-g1-p2", "person-deep-1", "person-deep-2-sister", "PERE_DE"),
                ("rel-g1-m2", "person-deep-1-wife", "person-deep-2-sister", "MERE_DE"),

                # Gen 2 Couples & Children
                ("rel-g2-spouse1", "person-deep-2", "person-deep-2-wife", "CONJOINT_DE"),
                ("rel-g2-spouse2", "person-deep-2-sister", "person-deep-2-husband", "CONJOINT_DE"),
                ("rel-g2-p1", "person-deep-2", "person-deep-3", "PERE_DE"),
                ("rel-g2-m1", "person-deep-2-wife", "person-deep-3", "MERE_DE"),
                ("rel-g2-p2", "person-deep-2", "person-deep-4", "PERE_DE"),
                ("rel-g2-m2", "person-deep-2-wife", "person-deep-4", "MERE_DE"),
                ("rel-g2-p3", "person-deep-2-husband", "person-deep-3-cousin", "PERE_DE"),
                ("rel-g2-m3", "person-deep-2-sister", "person-deep-3-cousin", "MERE_DE"),

                # Gen 3 Couples & Children
                ("rel-g3-spouse1", "person-deep-3", "person-deep-3-husband", "CONJOINT_DE"),
                ("rel-g3-spouse2", "person-deep-4", "person-deep-4-wife", "CONJOINT_DE"),
                ("rel-g3-m1", "person-deep-3", "person-deep-5-cousin", "MERE_DE"),
                ("rel-g3-p1", "person-deep-3-husband", "person-deep-5-cousin", "PERE_DE"),
                ("rel-g3-p2", "person-deep-4", "person-deep-5", "PERE_DE"),
                ("rel-g3-m2", "person-deep-4-wife", "person-deep-5", "MERE_DE"),

                # Gen 4 Couples & Children
                ("rel-g4-spouse1", "person-deep-5", "person-deep-5-husband", "CONJOINT_DE"),
                ("rel-g4-m1", "person-deep-5", "person-deep-6", "MERE_DE"),
                ("rel-g4-p1", "person-deep-5-husband", "person-deep-6", "PERE_DE"),

                # Gen 5 to 9 Lineage Chain
                ("rel-g5-spouse", "person-deep-6", "person-deep-6-wife", "CONJOINT_DE"),
                ("rel-g5-p1", "person-deep-6", "person-deep-7", "PERE_DE"),
                ("rel-g5-m1", "person-deep-6-wife", "person-deep-7", "MERE_DE"),
                ("rel-g6-p1", "person-deep-7", "person-deep-8", "MERE_DE"),
                ("rel-g7-p1", "person-deep-8", "person-deep-9", "PERE_DE"),
                ("rel-g8-p1", "person-deep-9", "person-deep-10", "MERE_DE"),
            ]
            for rid, src, tgt, rtype in rich_family_relations:
                if not db.query(FamilyRelation).filter(FamilyRelation.id == rid).first():
                    db.add(FamilyRelation(
                        id=rid,
                        campaign_id="camp-seed-1",
                        zone_id="zone-seed-1",
                        source_person_id=src,
                        target_person_id=tgt,
                        relation_type=rtype,
                        validation_status="VALIDATED",
                        sync_status="SYNCED",
                        created_by="user-admin-1",
                        created_at="2026-01-01T00:00:00Z",
                        updated_at="2026-01-01T00:00:00Z"
                    ))

            # --- 7B. Additional Family Relations across seed persons ---
            neutral_rel_types = ["CONJOINT_DE", "ENFANT_DE", "TUTEUR_DE", "RESPONSABLE_LEGAL_DE"]
            for i in range(1, 43):
                rid = f"rel-seed-{i}"
                if not db.query(FamilyRelation).filter(FamilyRelation.id == rid).first():
                    src_id = f"person-seed-{i}"
                    tgt_id = f"person-seed-{(i % 44) + 1}"
                    is_male_src = (i % 2 == 0)
                    cycle = (i - 1) % 6
                    if cycle == 0:
                        rtype = "PERE_DE" if is_male_src else "MERE_DE"
                    elif cycle == 1:
                        rtype = "MERE_DE" if not is_male_src else "PERE_DE"
                    else:
                        rtype = neutral_rel_types[(cycle - 2) % len(neutral_rel_types)]
                    db.add(FamilyRelation(
                        id=rid,
                        campaign_id=f"camp-seed-{(i % 10) + 1}",
                        zone_id=f"zone-seed-{(i % 10) + 1}",
                        source_person_id=src_id,
                        target_person_id=tgt_id,
                        relation_type=rtype,
                        validation_status="VALIDATED",
                        sync_status="SYNCED",
                        created_by="user-admin-1",
                        created_at="2026-01-01T00:00:00Z",
                        updated_at="2026-01-01T00:00:00Z"
                    ))
    except Exception as e:
        logger.error(f"Error seeding FamilyRelations: {e}")
        db.rollback()

    # 8. Seed MedicalHistories (50 Records)
    try:
        if db.query(MedicalHistory).count() < 50:
            conditions = [
                ("Hypertension Artérielle", "CARDIOVASCULAR", "MODERATE", True),
                ("Diabète de Type 2", "METABOLIC", "SEVERE", True),
                ("Drépanocytose", "GENETIC", "CRITICAL", True),
                ("Asthme Chronique", "RESPIRATORY", "MILD", False),
                ("Épilepsie", "NEUROLOGICAL", "SEVERE", True),
                ("Paludisme Récurrent", "OTHER", "MILD", False),
                ("Cardiopathie Congénitale", "CARDIOVASCULAR", "CRITICAL", True),
                ("Glaucome Héréditaire", "NEUROLOGICAL", "MODERATE", True),
            ]
            for i in range(1, 51):
                mid = f"med-seed-{i}"
                if not db.query(MedicalHistory).filter(MedicalHistory.id == mid).first():
                    cname, cat, sev, her = conditions[(i - 1) % len(conditions)]
                    # Assign first 10 medical records directly to the 10-generation lineage!
                    pid = f"person-deep-{(i % 10) + 1}" if i <= 15 else f"person-seed-{(i % 40) + 1}"
                    db.add(MedicalHistory(
                        id=mid,
                        person_id=pid,
                        campaign_id=f"camp-seed-{(i % 10) + 1}",
                        zone_id=f"zone-seed-{(i % 10) + 1}",
                        condition_name=cname,
                        category=cat,
                        severity=sev,
                        status="ACTIVE",
                        diagnosis_age=15 + (i * 3) % 50,
                        hereditary_risk=her,
                        validation_status="VALIDATED",
                        sync_status="SYNCED",
                        notes=f"Antécédent médical suivi lors du recensement {2020 + (i % 6)}.",
                        created_by="user-admin-1",
                        created_at="2026-01-01T00:00:00Z",
                        updated_at="2026-01-01T00:00:00Z"
                    ))
    except Exception as e:
        logger.error(f"Error seeding MedicalHistories: {e}")
        db.rollback()

    # 9. Seed AuditLogs (50 Logs)
    try:
        if db.query(AuditLog).count() < 50:
            actions = ["CREATE_PERSON", "UPDATE_HOUSEHOLD", "VALIDATE_RECORD", "SUBMIT_FORM", "LOGIN_SUCCESS", "EXPORT_REPORT"]
            entities = ["persons", "households", "users", "campaigns", "zones", "medical_histories"]
            for i in range(1, 51):
                aid = f"audit-seed-{i}"
                if not db.query(AuditLog).filter(AuditLog.id == aid).first():
                    db.add(AuditLog(
                        id=aid,
                        user_id="user-admin-1" if i % 2 == 0 else "user-supervisor-1",
                        action=actions[(i - 1) % len(actions)],
                        entity_type=entities[(i - 1) % len(entities)],
                        entity_id=f"item-seed-{i}",
                        created_at=f"2026-01-{(i%28)+1:02d}T10:00:00Z"
                    ))
    except Exception as e:
        logger.error(f"Error seeding AuditLogs: {e}")
        db.rollback()

    # 10. Seed FormDefinitions (50 Forms)
    try:
        existing_forms = db.query(FormDefinition).all()
        for f in existing_forms:
            updated_form = False
            if isinstance(f.title, str):
                f.title = {"fr": f.title, "en": f.title}
                updated_form = True
            if isinstance(f.description, str):
                f.description = {"fr": f.description or "", "en": f.description or ""}
                updated_form = True
            if updated_form:
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(f, "title")
                flag_modified(f, "description")

        if db.query(FormDefinition).count() < 50:
            categories = ["DEMOGRAPHIC", "HEALTH", "HOUSING", "AGRICULTURE", "EDUCATION", "EMPLOYMENT"]
            for i in range(1, 51):
                fid = f"form-seed-{i}"
                if not db.query(FormDefinition).filter(FormDefinition.id == fid).first():
                    cat = categories[(i - 1) % len(categories)]
                    db.add(FormDefinition(
                        id=fid,
                        title={"fr": f"Formulaire - {cat} v{i}", "en": f"Form - {cat} v{i}"},
                        description={"fr": f"Questionnaire officiel pour l'évaluation {cat.lower()}.", "en": f"Official questionnaire for {cat.lower()} evaluation."},
                        version=i,
                        fields=[
                            {"id": "q1", "type": "short_text", "label": {"fr": "Nom de la structure", "en": "Facility name"}, "required": True},
                            {"id": "q2", "type": "number", "label": {"fr": "Nombre d'habitants", "en": "Inhabitant count"}, "required": False}
                        ],
                        status="PUBLISHED" if i % 3 != 0 else "DRAFT",
                        created_by="user-admin-1",
                        created_at="2026-01-01T00:00:00Z",
                        updated_at="2026-01-01T00:00:00Z"
                    ))
    except Exception as e:
        logger.error(f"Error seeding FormDefinitions: {e}")
        db.rollback()

    # 11. Seed DuplicateCandidates (50 Duplicates)
    try:
        if db.query(DuplicateCandidate).count() < 50:
            statuses = ["PENDING", "RESOLVED_MERGED", "RESOLVED_NOT_DUPLICATE"]
            for i in range(1, 51):
                did = f"dup-seed-{i}"
                if not db.query(DuplicateCandidate).filter(DuplicateCandidate.id == did).first():
                    db.add(DuplicateCandidate(
                        id=did,
                        person_a_id=f"person-seed-{((i*2)%40)+1}",
                        person_b_id=f"person-seed-{((i*2+1)%40)+1}",
                        score=round(0.70 + (i % 28) * 0.01, 2),
                        status=statuses[(i - 1) % len(statuses)],
                        created_at="2026-01-01T00:00:00Z"
                    ))
    except Exception as e:
        logger.error(f"Error seeding DuplicateCandidates: {e}")
        db.rollback()

    # 12. Seed ChatGroups & ChatMessages
    try:
        if db.query(ChatGroup).count() == 0:
            group_general = ChatGroup(id="group-general", name="Canal Général Recensement 2026", created_at="2026-01-01T00:00:00Z")
            group_supervision = ChatGroup(id="group-supervision", name="Équipe Supervision & Contrôle", created_at="2026-01-01T00:00:00Z")
            db.add(group_general)
            db.add(group_supervision)

            seed_chat_messages = [
                ("msg-1", "Bonjour à tous les agents et superviseurs ! Bienvenue sur la plateforme AfriCensus Link.", "user-admin-1", "group-general", True, "2026-01-01T08:00:00Z", True),
                ("msg-2", "Merci Monsieur l'Administrateur. L'équipe du secteur Ouest est prête pour la campagne.", "user-supervisor-1", "group-general", True, "2026-01-01T08:15:00Z", True),
                ("msg-3", "Rappel : n'oubliez pas de synchroniser vos terminaux hors-ligne à la fin de la journée.", "user-admin-1", "group-general", True, "2026-01-01T09:00:00Z", False),
                ("msg-4", "Bonjour Superviseur, j'ai une question concernant la validation du ménage HH-0012.", "user-agent-1", "user-supervisor-1", False, "2026-01-02T10:30:00Z", False),
                ("msg-5", "Bonjour Agent, tu peux m'envoyer le code ménage pour vérification.", "user-supervisor-1", "user-agent-1", False, "2026-01-02T10:32:00Z", True),
            ]
            for mid, content, sender, receiver, is_grp, ts, read_st in seed_chat_messages:
                if not db.query(ChatMessage).filter(ChatMessage.id == mid).first():
                    db.add(ChatMessage(
                        id=mid, content=content, sender_id=sender, receiver_id=receiver,
                        is_group=is_grp, timestamp=ts, read=read_st, reply_to=None, reactions={}
                    ))
    except Exception as e:
        logger.error(f"Error seeding ChatMessages: {e}")
        db.rollback()

    # Final Commit
    try:
        db.commit()
        logger.info("Database seeding completed with ~50 tuples per entity and 10-level family tree.")
    except Exception as e:
        logger.error(f"Error committing seed data: {e}")
        db.rollback()
