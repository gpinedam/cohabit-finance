import os

from pydantic_settings import BaseSettings

_data_dir = os.getenv("COHABIT_DATA_DIR", "data")


class Settings(BaseSettings):
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 259200  # 6 months
    DATABASE_URL: str = f"sqlite:///{_data_dir}/app.db"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
