from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AfriCensus Link API"
    app_version: str = "0.1.0"
    environment: str = "development"
    database_url: str = Field(default="sqlite:///./data/africensus.db", alias="DATABASE_URL")
    auto_migrate: bool = Field(default=True, alias="AUTO_MIGRATE")
    frontend_dist: str = Field(default="frontend/dist/africensus-link/browser", alias="FRONTEND_DIST")
    frontend_public_url: str = Field(default="", alias="FRONTEND_PUBLIC_URL")
    default_language: str = Field(default="fr", alias="DEFAULT_LANGUAGE")
    supported_languages: str = Field(default="fr,en", alias="SUPPORTED_LANGUAGES")
    allowed_hosts: str = Field(default="*", alias="ALLOWED_HOSTS")
    security_headers_enabled: bool = Field(default=True, alias="SECURITY_HEADERS_ENABLED")
    auth_rate_limit_attempts: int = Field(default=5, alias="AUTH_RATE_LIMIT_ATTEMPTS")
    auth_rate_limit_window_seconds: int = Field(default=300, alias="AUTH_RATE_LIMIT_WINDOW_SECONDS")
    cors_origins: str = Field(
        default="http://localhost:4200,http://127.0.0.1:4200,http://localhost:8080,http://127.0.0.1:8080",
        alias="CORS_ORIGINS",
    )
    media_storage_provider: str = Field(default="local", alias="MEDIA_STORAGE_PROVIDER")
    media_base_url: str = Field(default="", alias="MEDIA_BASE_URL")
    aws_access_key_id: str | None = Field(default=None, alias="AWS_ACCESS_KEY_ID")
    aws_secret_access_key: str | None = Field(default=None, alias="AWS_SECRET_ACCESS_KEY")
    aws_region_name: str | None = Field(default=None, alias="AWS_REGION")
    aws_bucket_name: str | None = Field(default=None, alias="AWS_BUCKET_NAME")
    
    google_drive_folder_id: str | None = Field(default=None, alias="GOOGLE_DRIVE_FOLDER_ID")
    google_application_credentials_json: str | None = Field(default=None, alias="GOOGLE_APPLICATION_CREDENTIALS_JSON")

    smtp_host: str | None = Field(default=None, alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_user: str | None = Field(default=None, alias="SMTP_USER")
    smtp_password: str | None = Field(default=None, alias="SMTP_PASSWORD")
    smtp_tls: bool = Field(default=True, alias="SMTP_TLS")
    mail_from: str = Field(default="noreply@africensus.org", alias="MAIL_FROM")
    mail_from_name: str = Field(default="AfriCensus", alias="MAIL_FROM_NAME")

    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore", populate_by_name=True)

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def supported_language_list(self) -> list[str]:
        return [language.strip() for language in self.supported_languages.split(",") if language.strip()]

    @property
    def allowed_host_list(self) -> list[str]:
        return [host.strip() for host in self.allowed_hosts.split(",") if host.strip()]

    @property
    def frontend_path(self) -> Path:
        configured = Path(self.frontend_dist)
        if configured.is_absolute():
            return configured
        candidates = [
            Path.cwd() / configured,
            Path(__file__).resolve().parents[1] / configured,
            Path(__file__).resolve().parents[2] / configured,
        ]
        return next((candidate for candidate in candidates if candidate.exists()), candidates[0])


@lru_cache
def get_settings() -> Settings:
    return Settings()
