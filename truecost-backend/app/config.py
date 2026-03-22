from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    jwt_secret: str
    database_url: str

    class Config:
        env_file = ".env"


settings = Settings()