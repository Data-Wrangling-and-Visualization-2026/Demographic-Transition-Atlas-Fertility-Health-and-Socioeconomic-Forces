import json
from pathlib import Path
from sqlalchemy import text
from pipeline.db import get_engine

def main():
    cfg_path = Path("pipeline/config/indicators_wb.json")
    indicators = json.loads(cfg_path.read_text(encoding="utf-8"))

    data = [{"source": "worldbank", "code": i["code"], "name": i.get("name", ""), "unit": None}
            for i in indicators]

    sql = text("""
      insert into dim_indicator (source, code, name, unit)
      values (:source, :code, :name, :unit)
      on conflict (source, code) do update
      set name = excluded.name,
          unit = excluded.unit
    """)

    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(sql, data)

    print(f"inserted/updated indicators: {len(data)}")

if __name__ == "__main__":
    main()