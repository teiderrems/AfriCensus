from datetime import UTC, datetime
from enum import StrEnum
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int

from .field_i18n import field_metadata


class Role(StrEnum):
    AGENT = "AGENT"
    SUPERVISOR = "SUPERVISOR"
    ADMIN = "ADMIN"
    STATISTICIAN = "STATISTICIAN"
    AUDITOR = "AUDITOR"


class ValidationStatus(StrEnum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    VALIDATED = "VALIDATED"
    NEEDS_CORRECTION = "NEEDS_CORRECTION"
    REJECTED = "REJECTED"


class SyncStatus(StrEnum):
    LOCAL_ONLY = "LOCAL_ONLY"
    PENDING_SYNC = "PENDING_SYNC"
    SYNCED = "SYNCED"
    CONFLICT = "CONFLICT"


class MedicalSeverity(StrEnum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class MedicalStatus(StrEnum):
    ACTIVE = "ACTIVE"
    MONITORED = "MONITORED"
    RESOLVED = "RESOLVED"
    UNKNOWN = "UNKNOWN"


class ZoneType(StrEnum):
    COUNTRY = "COUNTRY"
    REGION = "REGION"
    DISTRICT = "DISTRICT"
    COMMUNE = "COMMUNE"
    VILLAGE = "VILLAGE"
    NEIGHBORHOOD = "NEIGHBORHOOD"
    ENUMERATION_AREA = "ENUMERATION_AREA"


class CampaignStatus(StrEnum):
    PLANNED = "PLANNED"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    COMPLETED = "COMPLETED"
    ARCHIVED = "ARCHIVED"


class LoginRequest(BaseModel):
    username: str = Field(..., description="Identifiant de connexion de l’utilisateur.", examples=["admin"])
    password: str = Field(..., description="Mot de passe de l’utilisateur.", examples=["admin123"])


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., description="Refresh token retourné par l’endpoint de connexion.")


class UserCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={"x-field-i18n": field_metadata("user")})

    username: str = Field(..., min_length=3, description="Identifiant unique de connexion.", examples=["agent.nord01"])
    email: EmailStr | None = Field(default=None, description="Adresse email de l'utilisateur.", examples=["agent@africensus.org"])
    phone: str | None = Field(default=None, pattern=r"^\+?[1-9]\d{1,14}$", description="Numéro de téléphone de l'utilisateur (format E.164).", examples=["+22890000000"])
    full_name: str = Field(..., description="Nom complet de l’utilisateur.", examples=["Kossi Akakpo"])
    role: Role = Field(..., description="Rôle applicatif attribué à l’utilisateur.")
    password: str = Field(..., min_length=6, description="Mot de passe initial.")
    active: bool = Field(default=True, description="Indique si le compte peut se connecter.")
    zone_ids: list[str] = Field(default_factory=list, description="Zones accessibles ou affectées à l’utilisateur.")
    disabled_features: list[str] = Field(default_factory=list, description="Modules désactivés pour cet utilisateur.")


class UserUpdate(BaseModel):
    model_config = ConfigDict(json_schema_extra={"x-field-i18n": field_metadata("user")})

    username: str | None = Field(default=None, min_length=3, description="Nouvel identifiant unique.")
    email: EmailStr | None = Field(default=None, description="Nouvelle adresse email.")
    phone: str | None = Field(default=None, pattern=r"^\+?[1-9]\d{1,14}$", description="Nouveau numéro de téléphone (format E.164).")
    full_name: str | None = Field(default=None, description="Nom complet.")
    active: bool | None = Field(default=None, description="Statut actif/inactif du compte.")
    zone_ids: list[str] | None = Field(default=None, description="Zones accessibles ou affectées.")
    preferred_language: str | None = Field(default=None, description="Langue préférée (fr, en).")
    disabled_features: list[str] | None = Field(default=None, description="Modules désactivés pour cet utilisateur.")


class UserRoleUpdate(BaseModel):
    role: Role = Field(..., description="Nouveau rôle de l’utilisateur.")


class PasswordUpdate(BaseModel):
    old_password: str = Field(..., description="Ancien mot de passe.")
    password: str = Field(..., min_length=6, description="Nouveau mot de passe.")

class AdminPasswordReset(BaseModel):
    password: str = Field(..., min_length=6, description="Nouveau mot de passe.")


class UserOut(BaseModel):
    id: str
    username: str
    email: EmailStr | None = None
    phone: str | None = None
    full_name: str
    role: Role
    zone_ids: list[str] = Field(default_factory=list)
    disabled_features: list[str] = Field(default_factory=list)
    active: bool = True
    preferred_language: str = "fr"


LocalizedString = str | dict[str, str]


class HomeLink(BaseModel):
    label: LocalizedString = Field(..., description="Libellé affiché, ou dictionnaire de traductions par langue.")
    href: str = Field(..., description="URL interne, ancre ou lien externe.")
    icon: str | None = Field(default=None, description="Icône Material Symbols optionnelle.")
    style: str | None = Field(default=None, description="Style visuel, par exemple `primary` ou `secondary`.")


class HomeHero(BaseModel):
    badge: LocalizedString
    title: LocalizedString
    subtitle: LocalizedString
    image_url: str | None = None
    image_alt: LocalizedString | None = None
    actions: list[HomeLink] = Field(default_factory=list)


class HomeMetric(BaseModel):
    value: LocalizedString
    label: LocalizedString
    tone: str = "primary"


class HomeValueCard(BaseModel):
    icon: str
    title: LocalizedString
    text: LocalizedString


class HomeSection(BaseModel):
    id: str
    eyebrow: LocalizedString
    title: LocalizedString
    text: LocalizedString
    bullets: list[LocalizedString] = Field(default_factory=list)
    visual: str = Field(default="dashboard", description="Type de visuel frontend : `dashboard` ou `phone`.")
    tone: str = "primary"


class HomeFooter(BaseModel):
    title: LocalizedString
    text: LocalizedString
    contact: LocalizedString


class HomeContentIn(BaseModel):
    model_config = ConfigDict(json_schema_extra={"x-field-i18n": field_metadata("home_content")})

    brand: str
    nav_links: list[HomeLink] = Field(default_factory=list)
    actions: list[HomeLink] = Field(default_factory=list)
    hero: HomeHero
    metrics: list[HomeMetric] = Field(default_factory=list)
    values: list[HomeValueCard] = Field(default_factory=list)
    sections: list[HomeSection] = Field(default_factory=list)
    footer: HomeFooter
    published: bool = True


class HomeContentOut(HomeContentIn):
    id: str
    created_by: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
    deleted_at: str | None = None


class FormDefinitionIn(BaseModel):
    title: dict[str, str] = Field(..., description="Titre multilingue du formulaire.")
    description: dict[str, str] = Field(default_factory=dict, description="Description multilingue du formulaire.")
    fields: list[dict[str, Any]] = Field(default_factory=list, description="Champs et règles du formulaire.")
    status: str = Field(default="DRAFT", description="Statut de publication du formulaire.")
    version: int = Field(default=1, ge=1, description="Version fonctionnelle du formulaire.")


class FormDefinitionOut(FormDefinitionIn):
    id: str
    created_by: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
    deleted_at: str | None = None


class FormResponseIn(BaseModel):
    form_definition_id: str = Field(..., description="L'ID de la définition de formulaire liée.")
    zone_id: str | None = Field(default=None, description="La zone associée.")
    campaign_id: str | None = Field(default=None, description="La campagne associée.")
    data: dict[str, Any] = Field(default_factory=dict, description="Les réponses sérialisées.")
    validation_status: ValidationStatus | str = Field(default=ValidationStatus.SUBMITTED)


class FormResponseOut(FormResponseIn):
    id: str
    sync_status: SyncStatus | str = Field(default=SyncStatus.SYNCED)
    decision_comment: str | None = None
    created_by: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
    deleted_at: str | None = None


class AuditLogOut(BaseModel):
    id: str
    user_id: str | None = None
    action: str
    entity_type: str
    entity_id: str
    user_name: str | None = None
    entity_name: str | None = None
    created_at: str


class PopulationSummaryOut(BaseModel):
    totalPersons: int
    totalHouseholds: int
    personsByGender: dict[str, int]
    personsByAgeGroup: dict[str, int] = {}
    personsByValidationStatus: dict[str, int] = {}
    personsByZone: dict[str, int] = {}
    withoutDocumentCount: int = 0
    vulnerablePersonsCount: int = 0
    averageMembersPerHousehold: float
    householdsByHousingType: dict[str, int] = {}
    householdsByOccupancyStatus: dict[str, int] = {}


class MedicalHistoryIn(BaseModel):
    model_config = ConfigDict(json_schema_extra={"x-field-i18n": field_metadata("medical_history")})

    local_id: str | None = Field(default=None, description="Identifiant local mobile, utile pour la synchronisation.")
    person_id: str = Field(..., description="Personne concernée par l’antécédent médical.")
    campaign_id: str = Field(..., description="Campagne associée à la collecte médicale.")
    condition_name: str = Field(..., min_length=2, description="Nom lisible de la pathologie ou condition.", examples=["Hypertension artérielle"])
    condition_code: str | None = Field(default=None, description="Code médical optionnel, par exemple CIM-10.", examples=["I10"])
    category: str = Field(..., description="Famille médicale de la condition.", examples=["CARDIOVASCULAR"])
    diagnosis_age: int | None = Field(default=None, ge=0, le=130, description="Âge estimé ou déclaré au diagnostic.")
    diagnosis_date: str | None = Field(default=None, description="Date de diagnostic au format ISO `YYYY-MM-DD` si connue.")
    severity: MedicalSeverity = Field(default=MedicalSeverity.MODERATE, description="Gravité déclarée ou évaluée.")
    status: MedicalStatus = Field(default=MedicalStatus.ACTIVE, description="Statut actuel de la condition.")
    hereditary_risk: bool = Field(default=False, description="Indique si la condition est considérée comme transmissible ou familiale.")
    notes: str | None = Field(default=None, description="Notes cliniques ou déclaratives non structurées.")


class MedicalHistoryOut(MedicalHistoryIn):
    id: str
    zone_id: str
    validation_status: ValidationStatus
    sync_status: SyncStatus | str
    decision_comment: str | None = None
    created_by: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
    deleted_at: str | None = None


class FamilyMedicalConditionSummary(BaseModel):
    condition_name: str
    category: str
    total_cases: int
    hereditary_cases: int
    affected_generations: list[str]
    severity_counts: dict[str, int]


class FamilyMedicalSummaryOut(BaseModel):
    root_person_id: str
    depth: int
    total_family_members: int
    total_medical_records: int
    hereditary_records: int
    conditions: list[FamilyMedicalConditionSummary]
    records: list[dict[str, Any]]


class ZoneIn(BaseModel):
    model_config = ConfigDict(json_schema_extra={"x-field-i18n": field_metadata("zone")})

    name: LocalizedString = Field(..., description="Nom lisible ou dictionnaire de traductions de la zone.", examples=["District Centre"])
    code: str = Field(..., description="Code unique de la zone.", examples=["CTR-01"])
    type: ZoneType = Field(..., description="Niveau administratif de la zone.")
    parent_id: str | None = Field(default=None, description="Identifiant de la zone parente.")
    status: str = Field(default="ACTIVE", description="Statut opérationnel de la zone.", examples=["ACTIVE"])


class CampaignIn(BaseModel):
    model_config = ConfigDict(json_schema_extra={"x-field-i18n": field_metadata("campaign")})

    name: LocalizedString = Field(..., description="Nom lisible ou dictionnaire de traductions de la campagne.", examples=["Recensement National 2026"])
    status: CampaignStatus = Field(default=CampaignStatus.PLANNED, description="Statut de la campagne.")
    start_date: str | None = Field(default=None, description="Date de début au format ISO `YYYY-MM-DD`.", examples=["2026-07-01"])
    end_date: str | None = Field(default=None, description="Date de fin au format ISO `YYYY-MM-DD`.", examples=["2026-12-31"])
    zone_ids: list[str] = Field(default_factory=list, description="Zones couvertes par la campagne.")


class HouseholdIn(BaseModel):
    model_config = ConfigDict(json_schema_extra={"x-field-i18n": field_metadata("household")})

    local_id: str | None = Field(default=None, description="Identifiant local mobile, utile pour la synchronisation.")
    household_code: str = Field(..., description="Code métier du ménage.", examples=["HH-8492"])
    campaign_id: str = Field(..., description="Campagne associée au ménage.")
    zone_id: str = Field(..., description="Zone de collecte du ménage.")
    head_person_id: str | None = None
    address_text: str = Field(..., description="Adresse descriptive ou repère terrain.")
    gps_latitude: float | None = Field(default=None, ge=-90, le=90, description="Latitude GPS du ménage.")
    gps_longitude: float | None = Field(default=None, ge=-180, le=180, description="Longitude GPS du ménage.")
    housing_type: str | None = None
    occupancy_status: str | None = None
    member_count: int = 0
    observation: str | None = None


class PersonIn(BaseModel):
    model_config = ConfigDict(json_schema_extra={"x-field-i18n": field_metadata("person")})

    local_id: str | None = None
    household_id: str
    campaign_id: str
    zone_id: str
    first_name: str = Field(..., description="Prénom principal.", examples=["Ama"])
    last_name: str = Field(..., description="Nom de famille.", examples=["Mensah"])
    other_names: str | None = None
    nickname: str | None = None
    gender: str = Field(..., description="Sexe ou genre déclaré.", examples=["F"])
    birth_date: str | None = None
    birth_date_estimated: bool = False
    estimated_age: int | None = None
    birth_place: str | None = None
    nationality: str | None = None
    primary_language: str | None = None
    marital_status: str | None = None
    occupation: str | None = None
    education_level: str | None = None
    phone: str | None = None
    is_without_document: bool = Field(default=False, description="Indique si la personne est enregistrée sans document officiel.")
    data_source_type: str | None = None
    vital_status: str | None = Field(default="ALIVE", description="Statut vital de la personne (ALIVE, DECEASED, UNKNOWN)")
    death_date: str | None = None
    death_place: str | None = None
    cause_of_death: str | None = None
    residency_status: str | None = Field(default=None, description="Statut de résidence (RESIDENT, TEMPORARY_ABSENT, MIGRATED, UNKNOWN)")
    arrival_date: str | None = None
    departure_date: str | None = None


class FamilyRelationIn(BaseModel):
    model_config = ConfigDict(json_schema_extra={"x-field-i18n": field_metadata("family_relation")})

    local_id: str | None = None
    campaign_id: str
    source_person_id: str
    target_person_id: str
    relation_type: str = Field(
        ...,
        description="Type de relation familiale.",
        examples=["PERE_DE", "MERE_DE", "ENFANT_DE", "CONJOINT_DE", "TUTEUR_DE"],
    )
    evidence_type: str | None = None
    source_type: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    comment: str | None = None


class DecisionRequest(BaseModel):
    comment: str | None = Field(default=None, description="Commentaire de validation, rejet ou demande de correction.")


class SyncItem(BaseModel):
    entity_type: str = Field(..., description="Type d’entité synchronisée.", examples=["household", "person", "family_relation"])
    operation: str = Field(..., description="Opération mobile à synchroniser.", examples=["CREATE", "UPDATE"])
    local_entity_id: str = Field(..., description="Identifiant local mobile de l’élément.")
    payload: dict[str, Any] = Field(..., description="Données métier de l’élément à synchroniser.")


class SyncPushRequest(BaseModel):
    items: list[SyncItem]


class SyncPushResult(BaseModel):
    local_entity_id: str
    server_id: str | None = None
    status: str
    error: str | None = None


class SyncPushResponse(BaseModel):
    results: list[SyncPushResult]


class SyncPullResponse(BaseModel):
    zones: list[dict[str, Any]]
    campaigns: list[dict[str, Any]]
    households: list[dict[str, Any]]
    persons: list[dict[str, Any]]
    family_relations: list[dict[str, Any]]
    medical_histories: list[dict[str, Any]]
    corrections: list[dict[str, Any]]
    forms: list[dict[str, Any]]
    documents: list[dict[str, Any]] = Field(default_factory=list)
    conversations: list[dict[str, Any]] = Field(default_factory=list)


class AppRoleIn(BaseModel):
    name: LocalizedString = Field(..., description="Nom ou traductions du rôle.")
    description: LocalizedString | None = None
    permissions: list[str] = Field(default_factory=list)
    disabled_features: list[str] = Field(default_factory=list, description="Liste des modules applicatifs désactivés pour ce rôle.")

class AppRoleOut(AppRoleIn):
    id: str
    created_at: str | None = None
    updated_at: str | None = None


class AssignmentIn(BaseModel):
    user_id: str
    zone_id: str

class AssignmentOut(AssignmentIn):
    id: str
    assigned_by: str | None = None
    created_at: str | None = None


class DocumentIn(BaseModel):
    local_id: str | None = None
    person_id: str
    document_type: str = Field(..., description="Type de document (ID, PASSPORT, etc.)")
    document_number: str
    issue_date: str | None = None
    expiry_date: str | None = None

class DocumentOut(DocumentIn):
    id: str
    created_by: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


def now_iso() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


class ChatMessageCreate(BaseModel):
    content: str
    receiver_id: str
    is_group: bool = False
    reply_to: str | None = None

class ChatMessageOut(BaseModel):
    id: str
    content: str
    sender_id: str
    receiver_id: str
    is_group: bool
    timestamp: str
    read: bool
    reply_to: str | None = None
    reactions: dict[str, list[str]] = Field(default_factory=dict)
    sender_name: str | None = None


class ReactionAdd(BaseModel):
    emoji: str


class ConversationSummary(BaseModel):
    id: str
    name: str
    is_group: bool
    avatar: str | None = None
    role: str | None = None
    last_message: str | None = None
    last_timestamp: str | None = None
    unread_count: int = 0


class ChatGroupCreate(BaseModel):
    name: str

class ChatGroupOut(BaseModel):
    id: str
    name: str
    created_at: str


class SupportTicketCreate(BaseModel):
    title: str
    description: str

class SupportTicketOut(BaseModel):
    id: str
    title: str
    description: str
    status: str
    user_id: str
    created_at: str


class FaqCreate(BaseModel):
    question: str
    answer: str
    category: str | None = None
    order: int = 0
    is_active: bool = True

class FaqUpdate(BaseModel):
    question: str | None = None
    answer: str | None = None
    category: str | None = None
    order: int | None = None
    is_active: bool | None = None

class FaqItemUpdate(BaseModel):
    category: dict[str, str] | None = None
    question: dict[str, str] | None = None
    answer: dict[str, str] | None = None
    order: int | None = None
    is_active: bool | None = None


class SupportTicketCreate(BaseModel):
    title: str = Field(..., max_length=200)
    description: str = Field(..., max_length=2000)
    category: str = Field(..., max_length=50)


class SupportTicketOut(BaseModel):
    id: str
    title: str
    description: str
    category: str
    status: str
    user_id: str
    created_at: str


class FaqIn(BaseModel):
    question: dict[str, str] = Field(..., description="Questions by language.")
    answer: dict[str, str] = Field(..., description="Answers by language.")
    category: dict[str, str] | None = Field(default=None, description="Categories by language.")
    order: int = 0
    is_active: bool = True

class FaqOut(FaqIn):
    id: str
    created_at: str | None = None
    updated_at: str | None = None


class ForgotPasswordRequest(BaseModel):
    username_or_email: str
    redirect_url: str | None = None
    sender_email: str | None = None


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str
    is_read: bool
    created_at: str

    model_config = ConfigDict(from_attributes=True)


# ── App Settings ───────────────────────────────────────────────────────────────

class AppBrandingIn(BaseModel):
    app_name: str = Field(default="AfriCensus Link", description="Nom de l'application affiché dans la sidebar et le titre de page.")
    logo_url: str | None = Field(default="assets/logo.png", description="URL du logo (laisser vide pour le logo par défaut).")
    primary_color: str = Field(default="#0284c7", description="Couleur primaire CSS hex, ex: #0284c7.")
    secondary_color: str = Field(default="#10b981", description="Couleur secondaire CSS hex, ex: #10b981.")
    primary_color_dark: str = Field(default="#38bdf8", description="Couleur primaire CSS hex pour le mode sombre.")
    secondary_color_dark: str = Field(default="#34d399", description="Couleur secondaire CSS hex pour le mode sombre.")
    font_family: str = Field(default="Inter, Arial, sans-serif", description="Police par défaut de l'interface.")
    base_font_size: str = Field(default="14px", description="Taille de police de base de l'interface (ex: 14px, 1rem).")
    card_radius: str = Field(default="16px", description="Arrondi des cartes et panneaux (ex: 16px, 0px).")
    button_radius: str = Field(default="8px", description="Arrondi des boutons (ex: 8px, 999px).")
    sidebar_bg: str = Field(default="", description="Couleur de fond de la sidebar. Vide = thème par défaut.")
    sidebar_text: str = Field(default="", description="Couleur du texte de la sidebar. Vide = thème par défaut.")
    favicon_url: str | None = Field(default=None, description="URL ou data URI (base64) du favicon.")
    login_heading: str | None = Field(default=None, description="Titre affiché sur la page de connexion. null = utilise app_name.")
    login_subheading: str | None = Field(default=None, description="Sous-titre affiché sur la page de connexion.")
    default_theme: str = Field(default="light", description="Thème par défaut : 'light' ou 'dark'.")


class AppSettingsIn(BaseModel):
    default_locale: str = Field(default="fr", description="Langue par défaut de l'interface : 'fr' ou 'en'.")
    timezone: str = Field(default="Africa/Abidjan", description="Fuseau horaire IANA, ex: Africa/Dakar.")
    date_format: str = Field(default="DD/MM/YYYY", description="Format de date affiché : 'DD/MM/YYYY' ou 'MM/DD/YYYY' ou 'YYYY-MM-DD'.")
    max_household_size: int = Field(default=30, ge=1, le=200, description="Taille maximale d'un ménage.")
    strict_collection_window: bool = Field(default=False, description="Si true, la saisie n'est autorisée que pendant la période de collecte active.")


class AppFeaturesIn(BaseModel):
    messaging: bool = Field(default=True, description="Activer le module de messagerie interne.")
    family_tree: bool = Field(default=True, description="Activer l'arbre généalogique.")
    medical_history: bool = Field(default=True, description="Activer le dossier médical.")
    custom_forms: bool = Field(default=True, description="Activer les formulaires personnalisés.")
    csv_export: bool = Field(default=True, description="Activer les exports CSV dans les rapports.")
    birth_declaration: bool = Field(default=True, description="Activer le module de déclaration de naissance.")
    duplicates: bool = Field(default=True, description="Activer la détection de doublons.")
    audit: bool = Field(default=True, description="Activer le journal d'audit.")


class AppHelpIn(BaseModel):
    quick_guide: dict[str, str] = Field(default_factory=dict, description="Guide rapide par langue.")
    contact_email: str | None = Field(default=None, description="Email du support technique.")
    contact_phone: str | None = Field(default=None, description="Téléphone du support technique.")


class AppSettingsOut(BaseModel):
    branding: AppBrandingIn
    settings: AppSettingsIn
    features: AppFeaturesIn
    help: AppHelpIn | None = None
