import os
from sqlalchemy import create_engine

def get_engine():
    host = os.getenv("POSTGRES_HOST", "postgres")   # внутри docker-compose это имя сервиса
    port = os.getenv("POSTGRES_PORT", "5432")
    name = os.getenv("POSTGRES_DB", "dwv")
    user = os.getenv("POSTGRES_USER", "dwv")
    password = os.getenv("POSTGRES_PASSWORD", "dwv")
    return create_engine(f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{name}")