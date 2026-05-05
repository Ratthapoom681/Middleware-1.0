from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "My App API"
    api_url: str = "http://localhost:8000"
    db_url: str = "sqlite:///./app.sqlite3"
    frontend_url: str = "http://localhost:5173"

    @property
    def cors_origins(self) -> list[str]:
        return [self.frontend_url]


settings = Settings()

