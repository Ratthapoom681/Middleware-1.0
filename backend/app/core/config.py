from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    app_name: str = "My App API"
    api_url: str = "http://localhost:8000"
    db_url: str = "sqlite:///./app.sqlite3"
    es_url: str = "http://localhost:9200"
    postgres_db: str = "app"
    postgres_user: str = "app"
    postgres_password: str = "app"
    frontend_url: str = "http://localhost:5173"

    @property
    def cors_origins(self) -> list[str]:
        return [self.frontend_url]


settings = Settings()
