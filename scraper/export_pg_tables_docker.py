from pathlib import Path
import pandas as pd
from sqlalchemy import create_engine
import os

DB_HOST = os.getenv("POSTGRES_HOST", "postgres")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_NAME = os.getenv("POSTGRES_DB", "dwv")
DB_USER = os.getenv("POSTGRES_USER", "dwv")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "dwv")

EXPORT_DIR = Path("/app/data_exports")
EXPORT_DIR.mkdir(exist_ok=True)

TABLES = [
    "dim_country",
    "dim_indicator",
    "fact_indicator_value",
    "raw_in_wpp",
]

def main() -> None:
    engine = create_engine(
        f"postgresql+psycopg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )

    for table in TABLES:
        print(f"Экспортирую {table}...")
        df = pd.read_sql(f"SELECT * FROM {table}", engine)

        out_path = EXPORT_DIR / f"{table}.csv"
        df.to_csv(out_path, index=False, encoding="utf-8")

        print(f"Сохранено: {out_path} | строк: {len(df)}")

    print("\nГотово.")

if __name__ == "__main__":
    main()