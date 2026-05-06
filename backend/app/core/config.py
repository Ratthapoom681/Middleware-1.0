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
    es_index_shards: int = 1
    es_index_replicas: int = 0
    wazuh_index_prefix: str = "wazuh-alerts"
    wazuh_retention_days: int = 90
    auth_enabled: bool = False
    api_key: str = ""
    log_level: str = "INFO"
    service_name: str = "backend"
    audit_retention_days: int = 180
    app_log_retention_days: int = 30
    error_retention_days: int = 90
    background_job_interval_sec: int = 300
    ingest_worker_interval_sec: int = 5
    ingest_worker_batch_size: int = 25
    demo_mode: bool = False
    demo_seed_on_startup: bool = False

    @property
    def cors_origins(self) -> list[str]:
        return [self.frontend_url]


settings = Settings()
