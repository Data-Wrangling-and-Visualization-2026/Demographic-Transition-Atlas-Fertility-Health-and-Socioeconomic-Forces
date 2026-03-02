from sqlalchemy import text
from pipeline.db import get_engine
from pipeline.sources.worldbank import fetch_countries

def s(x):
    return (x or "").strip()

def main():
    engine = get_engine()
    rows = fetch_countries()

    data = []
    skipped = 0

    for r in rows:
        iso3 = s(r.get("id"))          # iso3 у WB = id (например "ABW")
        iso2 = s(r.get("iso2Code"))    # iso2 у WB = iso2Code (например "AW")
        name = s(r.get("name"))

        region_obj = r.get("region") or {}
        region = s(region_obj.get("value"))
        region_id = s(region_obj.get("id"))

        income_obj = r.get("incomeLevel") or {}
        income_group = s(income_obj.get("value"))

        # фильтры валидности
        if len(iso3) != 3 or len(iso2) != 2:
            skipped += 1
            continue

        # фильтр агрегатов (World, регионы и т.п.)
        if region.lower() == "aggregates" or region_id.lower() == "na":
            skipped += 1
            continue

        data.append({
            "iso3": iso3,
            "iso2": iso2,
            "name": name,
            "region": region,
            "income_group": income_group
        })

    sql = text("""
        insert into dim_country (iso3, name, region, income_group, iso2)
        values (:iso3, :name, :region, :income_group, :iso2)
        on conflict (iso3) do update
        set name = excluded.name,
            region = excluded.region,
            income_group = excluded.income_group,
            iso2 = excluded.iso2
    """)

    with engine.begin() as conn:
        if data:
            conn.execute(sql, data)

    print(f"prepared rows: {len(rows)}")
    print(f"inserted/updated: {len(data)}")
    print(f"skipped: {skipped}")

if __name__ == "__main__":
    main()