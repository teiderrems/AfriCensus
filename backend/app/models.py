from typing import Any

from sqlalchemy import Boolean, Float, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class DictMixin:
    dict_fields: tuple[str, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        return {field: getattr(self, field) for field in self.dict_fields}


class User(Base, DictMixin):
    __tablename__ = "users"
    dict_fields = ("id", "username", "email", "phone", "full_name", "role", "password_hash", "active", "zone_ids", "password_changed_at", "force_password_change", "preferred_language", "disabled_features")

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    username: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(120), unique=True, index=True, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(40), unique=True, index=True, nullable=True)
    full_name: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(40), index=True)
    password_hash: Mapped[str] = mapped_column(String(128))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    zone_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    password_changed_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    force_password_change: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    preferred_language: Mapped[str] = mapped_column(String(10), default="fr", server_default="fr")
    disabled_features: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=True, server_default="[]")


class Zone(Base, DictMixin):
    __tablename__ = "geographic_zones"
    dict_fields = ("id", "name", "code", "type", "parent_id", "status", "progress", "created_by", "created_at", "updated_at", "deleted_at")

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[Any] = mapped_column(JSON)
    code: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    type: Mapped[str] = mapped_column(String(60), index=True)
    parent_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(40), default="ACTIVE", index=True)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    updated_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    deleted_at: Mapped[str | None] = mapped_column(String(40), nullable=True)


class Campaign(Base, DictMixin):
    __tablename__ = "campaigns"
    dict_fields = ("id", "name", "status", "start_date", "end_date", "zone_ids", "created_by", "created_at", "updated_at", "deleted_at")

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[Any] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(40), index=True)
    start_date: Mapped[str | None] = mapped_column(String(40), nullable=True)
    end_date: Mapped[str | None] = mapped_column(String(40), nullable=True)
    zone_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    updated_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    deleted_at: Mapped[str | None] = mapped_column(String(40), nullable=True)


class Household(Base, DictMixin):
    __tablename__ = "households"
    dict_fields = (
        "id", "local_id", "household_code", "campaign_id", "zone_id", "head_person_id", "address_text",
        "gps_latitude", "gps_longitude", "housing_type", "occupancy_status", "member_count", "observation",
        "validation_status", "sync_status", "decision_comment", "created_by", "created_at", "updated_at", "deleted_at",
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    local_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    household_code: Mapped[str] = mapped_column(String(120), index=True)
    campaign_id: Mapped[str] = mapped_column(String(64), index=True)
    zone_id: Mapped[str] = mapped_column(String(64), index=True)
    head_person_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    address_text: Mapped[str] = mapped_column(Text)
    gps_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    gps_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    housing_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    occupancy_status: Mapped[str | None] = mapped_column(String(120), nullable=True)
    member_count: Mapped[int] = mapped_column(Integer, default=0)
    observation: Mapped[str | None] = mapped_column(Text, nullable=True)
    validation_status: Mapped[str] = mapped_column(String(40), index=True)
    sync_status: Mapped[str] = mapped_column(String(40), index=True)
    decision_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    updated_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    deleted_at: Mapped[str | None] = mapped_column(String(40), nullable=True)


class Person(Base, DictMixin):
    __tablename__ = "persons"
    dict_fields = (
        "id", "local_id", "household_id", "campaign_id", "zone_id", "first_name", "last_name", "other_names",
        "nickname", "gender", "birth_date", "birth_date_estimated", "estimated_age", "birth_place", "nationality",
        "primary_language", "marital_status", "occupation", "education_level", "phone", "is_without_document",
        "data_source_type", "vital_status", "death_date", "death_place", "cause_of_death", "residency_status",
        "arrival_date", "departure_date", "validation_status", "sync_status", "decision_comment", "created_by",
        "created_at", "updated_at", "deleted_at",
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    local_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    household_id: Mapped[str] = mapped_column(String(64), index=True)
    campaign_id: Mapped[str] = mapped_column(String(64), index=True)
    zone_id: Mapped[str] = mapped_column(String(64), index=True)
    first_name: Mapped[str] = mapped_column(String(120), index=True)
    last_name: Mapped[str] = mapped_column(String(120), index=True)
    other_names: Mapped[str | None] = mapped_column(String(200), nullable=True)
    nickname: Mapped[str | None] = mapped_column(String(120), nullable=True)
    gender: Mapped[str] = mapped_column(String(20), index=True)
    birth_date: Mapped[str | None] = mapped_column(String(40), nullable=True)
    birth_date_estimated: Mapped[bool] = mapped_column(Boolean, default=False)
    estimated_age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    birth_place: Mapped[str | None] = mapped_column(String(160), nullable=True)
    nationality: Mapped[str | None] = mapped_column(String(120), nullable=True)
    primary_language: Mapped[str | None] = mapped_column(String(120), nullable=True)
    marital_status: Mapped[str | None] = mapped_column(String(80), nullable=True)
    occupation: Mapped[str | None] = mapped_column(String(160), nullable=True)
    education_level: Mapped[str | None] = mapped_column(String(120), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    is_without_document: Mapped[bool] = mapped_column(Boolean, default=False)
    data_source_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    vital_status: Mapped[str] = mapped_column(String(40), default="ALIVE", server_default="ALIVE")
    death_date: Mapped[str | None] = mapped_column(String(40), nullable=True)
    death_place: Mapped[str | None] = mapped_column(String(160), nullable=True)
    cause_of_death: Mapped[str | None] = mapped_column(String(160), nullable=True)
    residency_status: Mapped[str | None] = mapped_column(String(40), nullable=True)
    arrival_date: Mapped[str | None] = mapped_column(String(40), nullable=True)
    departure_date: Mapped[str | None] = mapped_column(String(40), nullable=True)
    validation_status: Mapped[str] = mapped_column(String(40), index=True)
    sync_status: Mapped[str] = mapped_column(String(40), index=True)
    decision_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    updated_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    deleted_at: Mapped[str | None] = mapped_column(String(40), nullable=True)


class FamilyRelation(Base, DictMixin):
    __tablename__ = "family_relations"
    dict_fields = (
        "id", "local_id", "campaign_id", "zone_id", "source_person_id", "target_person_id", "relation_type",
        "evidence_type", "source_type", "validation_status", "sync_status", "start_date", "end_date", "comment",
        "decision_comment", "created_by", "created_at", "updated_at", "deleted_at",
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    local_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    campaign_id: Mapped[str] = mapped_column(String(64), index=True)
    zone_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    source_person_id: Mapped[str] = mapped_column(String(64), index=True)
    target_person_id: Mapped[str] = mapped_column(String(64), index=True)
    relation_type: Mapped[str] = mapped_column(String(80), index=True)
    evidence_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    source_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    validation_status: Mapped[str] = mapped_column(String(40), index=True)
    sync_status: Mapped[str] = mapped_column(String(40), index=True)
    start_date: Mapped[str | None] = mapped_column(String(40), nullable=True)
    end_date: Mapped[str | None] = mapped_column(String(40), nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    decision_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    updated_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    deleted_at: Mapped[str | None] = mapped_column(String(40), nullable=True)


class MedicalHistory(Base, DictMixin):
    __tablename__ = "medical_histories"
    dict_fields = (
        "id", "local_id", "person_id", "campaign_id", "zone_id", "condition_name", "condition_code", "category",
        "diagnosis_age", "diagnosis_date", "severity", "status", "hereditary_risk", "notes",
        "validation_status", "sync_status", "decision_comment", "created_by", "created_at", "updated_at", "deleted_at",
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    local_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    person_id: Mapped[str] = mapped_column(String(64), index=True)
    campaign_id: Mapped[str] = mapped_column(String(64), index=True)
    zone_id: Mapped[str] = mapped_column(String(64), index=True)
    condition_name: Mapped[str] = mapped_column(String(180), index=True)
    condition_code: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    category: Mapped[str] = mapped_column(String(80), index=True)
    diagnosis_age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    diagnosis_date: Mapped[str | None] = mapped_column(String(40), nullable=True)
    severity: Mapped[str] = mapped_column(String(40), index=True)
    status: Mapped[str] = mapped_column(String(40), index=True)
    hereditary_risk: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    validation_status: Mapped[str] = mapped_column(String(40), index=True)
    sync_status: Mapped[str] = mapped_column(String(40), index=True)
    decision_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    updated_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    deleted_at: Mapped[str | None] = mapped_column(String(40), nullable=True)


class SystemSetting(Base, DictMixin):
    __tablename__ = "system_settings"
    dict_fields = ("key", "value_json")

    key: Mapped[str] = mapped_column(String(120), primary_key=True)
    value_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)


class AppRole(Base, DictMixin):
    __tablename__ = "app_roles"
    dict_fields = ("id", "name", "description", "permissions", "disabled_features", "created_at", "updated_at")

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    permissions: Mapped[list[str]] = mapped_column(JSON, default=list)
    disabled_features: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=True, server_default="[]")
    created_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    updated_at: Mapped[str | None] = mapped_column(String(40), nullable=True)


class Assignment(Base, DictMixin):
    __tablename__ = "assignments"
    dict_fields = ("id", "user_id", "zone_id", "assigned_by", "created_at", "updated_at", "deleted_at")

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    zone_id: Mapped[str] = mapped_column(String(64), index=True)
    assigned_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    updated_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    deleted_at: Mapped[str | None] = mapped_column(String(40), nullable=True)


class Document(Base, DictMixin):
    __tablename__ = "documents"
    dict_fields = (
        "id", "local_id", "person_id", "document_type", "document_number", 
        "issue_date", "expiry_date", "created_by", "created_at", "updated_at", "deleted_at"
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    local_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    person_id: Mapped[str] = mapped_column(String(64), index=True)
    document_type: Mapped[str] = mapped_column(String(80), index=True)
    document_number: Mapped[str] = mapped_column(String(120), index=True)
    issue_date: Mapped[str | None] = mapped_column(String(40), nullable=True)
    expiry_date: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    updated_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    deleted_at: Mapped[str | None] = mapped_column(String(40), nullable=True)


class FormDefinition(Base, DictMixin):
    __tablename__ = "form_definitions"
    dict_fields = ("id", "title", "description", "fields", "status", "version", "created_by", "created_at", "updated_at", "deleted_at")

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    description: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    fields: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(40), default="DRAFT", index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    updated_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    deleted_at: Mapped[str | None] = mapped_column(String(40), nullable=True)


class FormResponse(Base, DictMixin):
    __tablename__ = "form_responses"
    dict_fields = ("id", "form_definition_id", "zone_id", "campaign_id", "data", "validation_status", "sync_status", "decision_comment", "created_by", "created_at", "updated_at", "deleted_at")

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    form_definition_id: Mapped[str] = mapped_column(String(64), index=True)
    zone_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    campaign_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    data: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    validation_status: Mapped[str] = mapped_column(String(40), default="SUBMITTED", index=True)
    sync_status: Mapped[str] = mapped_column(String(40), default="synced", index=True)
    decision_comment: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    updated_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    deleted_at: Mapped[str | None] = mapped_column(String(40), nullable=True)


class AuditLog(Base, DictMixin):
    __tablename__ = "audit_logs"
    dict_fields = ("id", "user_id", "action", "entity_type", "entity_id", "created_at")

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(120), index=True)
    entity_type: Mapped[str] = mapped_column(String(120), index=True)
    entity_id: Mapped[str] = mapped_column(String(120), index=True)
    created_at: Mapped[str] = mapped_column(String(40), index=True)


class DuplicateCandidate(Base, DictMixin):
    __tablename__ = "duplicate_candidates"
    dict_fields = ("id", "person_a_id", "person_b_id", "score", "status", "created_at")

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    person_a_id: Mapped[str] = mapped_column(String(64), index=True)
    person_b_id: Mapped[str] = mapped_column(String(64), index=True)
    score: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(40), index=True)
    created_at: Mapped[str] = mapped_column(String(40), index=True)


class HomeContent(Base, DictMixin):
    __tablename__ = "home_content"
    dict_fields = (
        "id", "brand", "nav_links", "actions", "hero", "metrics", "values", "sections",
        "footer", "published", "created_by", "created_at", "updated_at", "deleted_at",
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    brand: Mapped[str] = mapped_column(String(200))
    nav_links: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    actions: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    hero: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    metrics: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    values: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    sections: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    footer: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    published: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    updated_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    deleted_at: Mapped[str | None] = mapped_column(String(40), nullable=True)


class ChatMessage(Base, DictMixin):
    __tablename__ = "chat_messages"
    dict_fields = ("id", "content", "sender_id", "receiver_id", "is_group", "timestamp", "read", "reply_to", "reactions")

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    content: Mapped[str] = mapped_column(Text)
    sender_id: Mapped[str] = mapped_column(String(64), index=True)
    receiver_id: Mapped[str] = mapped_column(String(64), index=True)
    is_group: Mapped[bool] = mapped_column(Boolean, default=False)
    timestamp: Mapped[str] = mapped_column(String(40), index=True)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    reply_to: Mapped[str | None] = mapped_column(String(64), nullable=True)
    reactions: Mapped[dict[str, list[str]]] = mapped_column(JSON, default=dict)


class ChatGroup(Base, DictMixin):
    __tablename__ = "chat_groups"
    dict_fields = ("id", "name", "created_at")

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[str] = mapped_column(String(40))


class ChatGroupMember(Base, DictMixin):
    __tablename__ = "chat_group_members"
    dict_fields = ("group_id", "user_id")

    group_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), primary_key=True)


class SupportTicket(Base, DictMixin):
    __tablename__ = "support_tickets"
    dict_fields = ("id", "title", "description", "category", "status", "user_id", "created_at")

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(String(2000))
    category: Mapped[str] = mapped_column(String(50), default="GENERAL_QUESTION")
    status: Mapped[str] = mapped_column(String(40), default="open", index=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[str] = mapped_column(String(40))


class FaqItem(Base, DictMixin):
    __tablename__ = "faq_items"
    dict_fields = ("id", "question", "answer", "category", "order", "is_active", "created_at", "updated_at")

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    question: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    answer: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    category: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    updated_at: Mapped[str | None] = mapped_column(String(40), nullable=True)


class Attachment(Base, DictMixin):
    __tablename__ = "attachments"
    dict_fields = (
        "id", "local_id", "entity_type", "entity_id", "attachment_type", 
        "file_name", "mime_type", "file_size", "file_path", "sync_status",
        "created_by", "created_at", "updated_at", "deleted_at"
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    local_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    entity_type: Mapped[str] = mapped_column(String(80), index=True)
    entity_id: Mapped[str] = mapped_column(String(120), index=True)
    attachment_type: Mapped[str] = mapped_column(String(80), index=True)
    file_name: Mapped[str] = mapped_column(String(255))
    mime_type: Mapped[str] = mapped_column(String(120))
    file_size: Mapped[int] = mapped_column(Integer)
    file_path: Mapped[str] = mapped_column(String(500))
    sync_status: Mapped[str] = mapped_column(String(40), index=True, default="synced")
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    updated_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    deleted_at: Mapped[str | None] = mapped_column(String(40), nullable=True)


class Notification(Base, DictMixin):
    __tablename__ = "notifications"
    dict_fields = ("id", "user_id", "title", "message", "type", "is_read", "created_at")

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(40), default="info")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[str | None] = mapped_column(String(40), nullable=True)


def _clean_payload(model: type, payload: dict) -> dict:
    from typing import Any
    fields = set(model.dict_fields)
    cleaned = {key: _scalar(value) for key, value in payload.items() if key in fields}
    if model.__name__ == 'HomeContent' and isinstance(cleaned.get('brand'), dict):
        cleaned['brand'] = _localized_scalar(cleaned['brand'])
    return cleaned

def _scalar(value: Any) -> Any:
    from typing import Any
    if hasattr(value, 'value'):
        return value.value
    return value

def _localized_scalar(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: _scalar(v) for k, v in value.items()}
    return _scalar(value)

MODEL_BY_COLLECTION = {
    'users': User,
    'audit_logs': AuditLog,
    'zones': Zone,
    'campaigns': Campaign,
    'households': Household,
    'persons': Person,
    'family_relations': FamilyRelation,
    'medical_histories': MedicalHistory,
    'form_definitions': FormDefinition,
    'assignments': Assignment,
    'documents': Document,
    'home_content': HomeContent,
    'system_settings': SystemSetting,
    'attachments': Attachment,
    'form_responses': FormResponse,
    'notifications': Notification,
}
