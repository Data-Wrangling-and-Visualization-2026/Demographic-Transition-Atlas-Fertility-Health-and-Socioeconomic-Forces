import json
from pathlib import Path
from sqlalchemy import text
import pandas as pd

from pipeline.db import get_engine
from pipeline.sources.un import get_data


def chunk_list(lst, size):
    for i in range(0, len(lst), size):
        yield lst[i : i + size]


def main():
    # 1) читаем выбранные индикаторы UN
    cfg = json.loads(Path("pipeline/config/indicators_un.json").read_text(encoding="utf-8"))
    if not cfg:
        raise RuntimeError("indicators_un.json is empty")

    indicator_id = cfg[0].get("id") or cfg[0].get("code")
    if indicator_id is None:
        raise RuntimeError("No 'id' or 'code' found in indicators_un.json[0]")

    indicator_id = int(indicator_id)

    # 2) читаем маппинг UN location -> iso3, берем только те, где iso3 заполнен
    map_df = pd.read_csv("pipeline/config/un_to_iso3.csv")
    map_df = map_df.dropna(subset=["iso3"])
    if "un_location_id" not in map_df.columns:
        raise RuntimeError("un_to_iso3.csv must contain column 'un_location_id'")

    location_ids = map_df["un_location_id"].astype(int).tolist()
    if not location_ids:
        raise RuntimeError("No mapped locations found in un_to_iso3.csv (iso3 filled)")

    # 3) параметры выгрузки
    start_year = 1970
    end_year = 2030
    batch_size = 20  # безопасно для URL/серверов
    page_size = 1000

    engine = get_engine()
    insert_sql = text("""
        insert into raw_ingest (source, request_url, payload_json)
        values (:source, :request_url, cast(:payload_json as jsonb))
    """)

    total_batches = 0
    total_rows = 0

    for batch_num, batch in enumerate(chunk_list(location_ids, batch_size), start=1):
        # 4) качаем данные UN одним запросом на батч
        df = get_data([indicator_id], batch, start=start_year, end=end_year, page_size=page_size)
        rows = df.to_dict(orient="records")
        total_rows += len(rows)

        payload = {
            "indicator_id": indicator_id,
            "start_year": start_year,
            "end_year": end_year,
            "batch_num": batch_num,
            "location_ids": batch,
            "rows": rows
        }

        req_url = (
            f"un/data/indicators/{indicator_id}/locations/"
            f"{','.join(map(str, batch))}?startYear={start_year}&endYear={end_year}&pageSize={page_size}"
        )

        # 5) сохраняем raw одной записью на батч
        with engine.begin() as conn:
            conn.execute(insert_sql, {
                "source": "un",
                "request_url": req_url,
                "payload_json": json.dumps(payload)
            })

        total_batches += 1
        print(f"un indicator {indicator_id}: saved batch {batch_num} (locations={len(batch)} rows={len(rows)})")

    print(f"done. saved batches={total_batches}, total_rows_in_raw_payloads={total_rows}")


if __name__ == "__main__":
    main()