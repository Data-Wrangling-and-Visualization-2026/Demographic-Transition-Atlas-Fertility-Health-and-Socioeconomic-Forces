from sqlalchemy import text
from pipeline.db import get_engine

engine = get_engine()
with engine.connect() as conn:
    print(conn.execute(text("select 1")).fetchone())
