from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Server configuration loaded only from environment variables."""

    environment: str = "development"
    cors_origins: str = "http://localhost:4174,http://127.0.0.1:4174"
    supabase_url: str | None = None
    supabase_service_key: str | None = None
    supabase_storage_bucket: str = "author-assets"
    brevo_api_key: str | None = None
    brevo_list_id: int | None = None
    brevo_sender_email: str | None = None
    brevo_sender_name: str = "Deborah Fowler"
    admin_emails: str = ""
    session_secret: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @field_validator("brevo_list_id", mode="before")
    @classmethod
    def blank_brevo_list_id_is_unconfigured(cls, value: object) -> object:
        """Allow a temporarily blank Railway variable without preventing startup."""
        return None if isinstance(value, str) and not value.strip() else value

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def supabase_is_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_key)

    @property
    def brevo_is_configured(self) -> bool:
        return bool(self.brevo_api_key and self.brevo_list_id)

    @property
    def permitted_admin_emails(self) -> set[str]:
        return {email.strip().lower() for email in self.admin_emails.split(",") if email.strip()}

    @property
    def admin_auth_is_configured(self) -> bool:
        return bool(self.supabase_is_configured and self.permitted_admin_emails and self.session_secret)


@lru_cache
def get_settings() -> Settings:
    return Settings()
