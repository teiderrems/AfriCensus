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
    dict_fields = ("id", "username", "full_name", "role", "password_hash", "active", "zone_ids")

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    username: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(40), index=True)
    password_hash: Mapped[str] = mapped_column(String(128))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    zone_ids: Mapped[list[str]] = mapped_column(JSON, default=list)


class Zone(Base, DictMixin):
    __tablename__ = "geographic_zones"
    dict_fields = ("id", "name", "code", "type", "parent_id", "status", "progress", "created_by", "created_at", "updated_at", "deleted_at")

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
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
    name: Mapped[str] = mapped_column(String(200), index=True)
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
