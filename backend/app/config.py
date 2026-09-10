from functools import lru_cache

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

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def supabase_is_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_key)

    @property
    def brevo_is_configured(self) -> bool:
        return bool(self.brevo_api_key and self.brevo_list_id)


@lru_cache
def get_settings() -> Settings:
    return Settings()

