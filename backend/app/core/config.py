"""Application settings loaded from environment variables."""

from functools import lru_cache
from typing import Optional

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Strongly typed runtime configuration for the backend service."""

    app_name: str = "Order Processing API"
    api_prefix: str = "/api"
    environment: str = "development"
    postgres_host: str = "db"
    postgres_port: int = 5432
    postgres_user: str = "order_user"
    postgres_password: str = "order_password"
    postgres_db: str = "order_processing"
    database_url: Optional[str] = None
    auth_token_ttl_hours: int = 24
    auth_cookie_name: str = "ops_session"
    secure_cookies: bool = False
    trust_proxy_headers: bool = False
    password_min_length: int = 8
    cors_origins: str = ""
    registration_rate_limit_attempts: int = 5
    registration_rate_limit_window_seconds: int = 300
    login_rate_limit_attempts: int = 10
    login_rate_limit_window_seconds: int = 300
    bootstrap_admin_email: Optional[str] = None
    bootstrap_admin_password: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @computed_field
    @property
    def resolved_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return (
            "postgresql+psycopg://"
            f"{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @computed_field
    @property
    def allowed_cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Reuse one settings object per process to avoid repeated env parsing."""

    return Settings()
