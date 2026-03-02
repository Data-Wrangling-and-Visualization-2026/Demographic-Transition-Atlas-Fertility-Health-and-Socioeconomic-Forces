import json
from sqlalchemy import text
from pipeline.db import get_engine

def main():
    engine = get_engine()

    # Берём raw постранично
    sel = text("""
      select id, payload_json
      from raw_ingest
      where source='worldbank'
      order by id;
    """)

    upsert = text("""
      insert into fact_indicator_value (country_iso3, year, source, indicator_code, value)
      values (:country_iso3, :year, 'worldbank', :indicator_code, :value)
      on conflict (country_iso3, year, source, indicator_code) do update
      set value = excluded.value
    """)

    inserted = 0
    skipped = 0

    with engine.begin() as conn:
        raws = conn.execute(sel).fetchall()

        for _, payload in raws:
            obj = payload if isinstance(payload, dict) else json.loads(payload)

            indicator_code = obj.get("indicator_code")
            rows = obj.get("rows", [])

            batch = []
            for r in rows:
                iso3 = (r.get("countryiso3code") or "").strip()
                year = r.get("date")
                value = r.get("value")

                if not iso3 or not year or not indicator_code:
                    skipped += 1
                    continue

                try:
                    year_int = int(year)
                except:
                    skipped += 1
                    continue

                batch.append({
                    "country_iso3": iso3,
                    "year": year_int,
                    "indicator_code": indicator_code,
                    "value": value
                })

            if batch:
                conn.execute(upsert, batch)
                inserted += len(batch)

    print(f"total inserted/updated: {inserted}")
    print(f"skipped: {skipped}")

if __name__ == "__main__":
    main()