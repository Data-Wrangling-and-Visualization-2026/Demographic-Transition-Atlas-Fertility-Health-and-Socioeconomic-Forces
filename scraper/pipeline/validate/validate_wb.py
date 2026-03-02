from sqlalchemy import text
from pipeline.db import get_engine
from pathlib import Path

def main():
    engine = get_engine()

    queries = {
        "total_rows_fact": "select count(*) as n from fact_indicator_value;",
        "rows_by_indicator": """
            select indicator_code, count(*) as n
            from fact_indicator_value
            group by indicator_code
            order by n desc;
        """,
        "year_range": """
            select min(year) as min_year, max(year) as max_year
            from fact_indicator_value;
        """,
        "missing_values_by_indicator": """
            select indicator_code,
                   sum(case when value is null then 1 else 0 end) as missing,
                   count(*) as total
            from fact_indicator_value
            group by indicator_code
            order by missing desc;
        """,
        "top_countries_by_rows": """
            select country_iso3, count(*) as n
            from fact_indicator_value
            group by country_iso3
            order by n desc
            limit 20;
        """
    }

    report_lines = []
    with engine.connect() as conn:
        for title, q in queries.items():
            res = conn.execute(text(q)).fetchall()
            report_lines.append(f"## {title}\n")
            report_lines.append("```\n")
            for row in res[:50]:
                report_lines.append(str(row) + "\n")
            if len(res) > 50:
                report_lines.append(f"... ({len(res)} rows)\n")
            report_lines.append("```\n\n")

    out_path = Path("docs/validation_wb.md")
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with open(out_path, "w", encoding="utf-8") as f:
        f.writelines(report_lines)

    print(f"saved report to {out_path}")

if __name__ == "__main__":
    main()