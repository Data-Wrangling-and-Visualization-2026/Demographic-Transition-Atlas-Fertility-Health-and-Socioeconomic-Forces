import json
from pathlib import Path
from sqlalchemy import text
from pipeline.db import get_engine
from pipeline.sources.worldbank import iter_indicator_pages

def main():
    cfg_path = Path("pipeline/config/indicators_wb.json")
    indicators = json.loads(cfg_path.read_text(encoding="utf-8"))

    engine = get_engine()
    insert_sql = text("""
      insert into raw_ingest (source, request_url, payload_json)
      values (:source, :request_url, cast(:payload_json as jsonb))
    """)

    total_pages_saved = 0

    with engine.begin() as conn:
        for ind in indicators:
            code = ind["code"]
            pages_saved_for_indicator = 0

            for page, pages_total, rows, req_url in iter_indicator_pages(code, 1960, 2024):
                payload = {
                    "indicator_code": code,
                    "page": page,
                    "pages_total": pages_total,
                    "rows": rows
                }

                conn.execute(insert_sql, {
                    "source": "worldbank",
                    "request_url": req_url,
                    "payload_json": json.dumps(payload)
                })

                pages_saved_for_indicator += 1
                total_pages_saved += 1

                if page % 10 == 0 or page == pages_total:
                    print(f"{code}: saved page {page}/{pages_total} (rows_on_page={len(rows)})")

            print(f"{code}: done, pages_saved={pages_saved_for_indicator}")

    print(f"raw_ingest pages saved total: {total_pages_saved}")

if __name__ == "__main__":
    main()