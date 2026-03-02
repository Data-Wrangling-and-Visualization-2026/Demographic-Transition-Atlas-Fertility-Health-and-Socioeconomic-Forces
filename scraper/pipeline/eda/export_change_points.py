import csv
from sqlalchemy import text
from pipeline.db import get_engine

SQL_DROP = """
with t as (
  select
    country_iso3,
    year,
    value,
    lag(value) over (partition by country_iso3 order by year) as prev_value
  from fact_indicator_value
  where indicator_code='SP.DYN.TFRT.IN'
    and value is not null
)
select country_iso3, year, prev_value, value, (value - prev_value) as delta
from t
where prev_value is not null
order by delta asc
limit 100;
"""

SQL_GROW = """
with t as (
  select
    country_iso3,
    year,
    value,
    lag(value) over (partition by country_iso3 order by year) as prev_value
  from fact_indicator_value
  where indicator_code='SP.DYN.TFRT.IN'
    and value is not null
)
select country_iso3, year, prev_value, value, (value - prev_value) as delta
from t
where prev_value is not null
order by delta desc
limit 100;
"""

def main():
    engine = get_engine()

    with engine.connect() as conn:
        drops = conn.execute(text(SQL_DROP)).fetchall()
        grows = conn.execute(text(SQL_GROW)).fetchall()

    out_path = "docs/change_points_fertility.csv"
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["type", "country_iso3", "year", "prev_value", "value", "delta"])
        for r in drops:
            w.writerow(["drop", r[0], r[1], r[2], r[3], r[4]])
        for r in grows:
            w.writerow(["grow", r[0], r[1], r[2], r[3], r[4]])

    print(f"saved {len(drops)+len(grows)} rows to {out_path}")

if __name__ == "__main__":
    main()