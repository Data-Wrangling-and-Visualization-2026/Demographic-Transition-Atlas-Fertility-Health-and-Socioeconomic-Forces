import json
from sqlalchemy import text
from pipeline.db import get_engine

def safe_int(x):
    try:
        return int(x)
    except (TypeError, ValueError):
        return None

def main():
    engine = get_engine()

    sel = text("""
        select payload_json
        from raw_ingest
        where source='un'
        order by id;
    """)

    upsert = text("""
        insert into fact_indicator_value (country_iso3, year, source, indicator_code, value)
        values (:country_iso3, :year, 'un', :indicator_code, :value)
        on conflict (country_iso3, year, source, indicator_code) do update
        set value = excluded.value
    """)

    # choose a slice that exists in your raw payloads
    WANT_SEX_ID = 2       # Female
    WANT_AGE_ID = 31      # 15-49
    WANT_ESTIMATE_TYPE_ID = 1  # Model-based Estimates (exists in your sample)

    # Prefer "All women" (99), otherwise accept "Married or in a union women" (100)
    PREFERRED_CATEGORIES = {99, 100}

    inserted = 0
    scanned = 0
    filtered = 0
    bad = 0

    with engine.begin() as conn:
        raws = conn.execute(sel).fetchall()

        for (payload,) in raws:
            obj = payload if isinstance(payload, dict) else json.loads(payload)

            indicator_id = obj.get("indicator_id") or obj.get("indicatorId")
            indicator_code = f"UN_{indicator_id}"

            rows = obj.get("rows", [])
            batch = []

            for r in rows:
                scanned += 1

                if r.get("sexId") != WANT_SEX_ID:
                    filtered += 1
                    continue
                if r.get("ageId") != WANT_AGE_ID:
                    filtered += 1
                    continue
                if r.get("estimateTypeId") != WANT_ESTIMATE_TYPE_ID:
                    filtered += 1
                    continue
                if r.get("categoryId") not in PREFERRED_CATEGORIES:
                    filtered += 1
                    continue

                iso3 = (r.get("iso3") or "").strip()
                year = safe_int(r.get("timeLabel")) or safe_int(r.get("timeId"))
                value = r.get("value")

                if not iso3 or year is None:
                    bad += 1
                    continue

                batch.append({
                    "country_iso3": iso3,
                    "year": year,
                    "indicator_code": indicator_code,
                    "value": value
                })

            if batch:
                conn.execute(upsert, batch)
                inserted += len(batch)

    print(f"scanned: {scanned}")
    print(f"filtered out: {filtered}")
    print(f"bad rows: {bad}")
    print(f"inserted/updated: {inserted}")
    print("note: UN facts saved for sexId=2, ageId=31, estimateTypeId=1, categoryId in {99,100}.")

if __name__ == "__main__":
    main()