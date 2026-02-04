from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    redis_url: str = "redis://redis:6379/0"

    celery_broker_url: str
    celery_result_backend: str

    jwt_secret: str
    jwt_alg: str = "HS256"
    access_token_expire_minutes: int = 120

    cors_allow_origins: str = "https://anket.olcme.tr"

    env: str = "prod"
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
