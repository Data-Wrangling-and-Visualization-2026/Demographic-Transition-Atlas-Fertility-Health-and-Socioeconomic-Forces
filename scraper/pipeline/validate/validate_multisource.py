import os
from pathlib import Path
from sqlalchemy import text
from pipeline.db import get_engine

def run(conn, title, sql):
    rows = conn.execute(text(sql)).fetchall()
    out = [f"## {title}\n\n", "```text\n"]
    for r in rows[:80]:
        out.append(str(r) + "\n")
    if len(rows) > 80:
        out.append(f"... ({len(rows)} rows)\n")
    out.append("```\n\n")
    return out

def main():
    engine = get_engine()
    report = ["# Multi-source validation (World Bank + UN)\n\n"]

    with engine.connect() as conn:
        # 1) строки по источникам (fact)
        report += run(conn, "Fact rows by source", """
            select source, count(*) as n
            from fact_indicator_value
            group by source
            order by n desc;
        """)

        # 2) строки по индикаторам (UN)
        report += run(conn, "UN fact rows by indicator", """
            select indicator_code, count(*) as n
            from fact_indicator_value
            where source='un'
            group by indicator_code
            order by n desc;
        """)

        # 3) coverage стран: сколько iso3 есть в WB vs UN
        report += run(conn, "Country coverage (distinct iso3) by source", """
            select source, count(distinct country_iso3) as countries
            from fact_indicator_value
            group by source
            order by countries desc;
        """)

        # 4) какие страны есть в UN, но нет в WB (должно быть мало/0)
        report += run(conn, "UN-only countries (present in UN facts, missing in WB facts)", """
            with wb as (
              select distinct country_iso3 from fact_indicator_value where source='worldbank'
            ),
            un as (
              select distinct country_iso3 from fact_indicator_value where source='un'
            )
            select u.country_iso3
            from un u
            left join wb on wb.country_iso3 = u.country_iso3
            where wb.country_iso3 is null
            order by u.country_iso3
            limit 200;
        """)

        # 5) sanity: диапазон лет по источникам
        report += run(conn, "Year range by source", """
            select source, min(year) as min_year, max(year) as max_year
            from fact_indicator_value
            group by source
            order by source;
        """)

    out_path = Path("docs/validation_multisource.md")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("".join(report), encoding="utf-8")

    print(f"saved report to {out_path}")

if __name__ == "__main__":
    main()