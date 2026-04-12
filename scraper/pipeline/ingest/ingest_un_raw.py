import json
import logging
from pathlib import Path

import pandas as pd
from sqlalchemy import text

from pipeline.db import get_engine
from pipeline.sources.un import get_data


LOG_DIR = Path("logs")
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOG_DIR / "ingest_un_raw.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


def chunk_list(lst, size):
    for i in range(0, len(lst), size):
        yield lst[i:i + size]


def load_indicator_config():
    cfg_path = Path("pipeline/config/indicators_un.json")
    if not cfg_path.exists():
        raise FileNotFoundError(f"Config file not found: {cfg_path}")

    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    if not cfg:
        raise RuntimeError("indicators_un.json is empty")

    indicators = []
    for idx, item in enumerate(cfg):
        indicator_id = item.get("id") or item.get("code")
        indicator_name = item.get("name", "")

        if indicator_id is None:
            logger.warning(f"Skip config item #{idx}: no 'id' or 'code' -> {item}")
            continue

        indicators.append({
            "id": int(indicator_id),
            "name": indicator_name
        })

    if not indicators:
        raise RuntimeError("No valid indicators found in indicators_un.json")

    return indicators


def load_locations():
    path = Path("pipeline/config/un_to_iso3.csv")
    if not path.exists():
        raise FileNotFoundError(f"Mapping file not found: {path}")

    map_df = pd.read_csv(path)
    map_df = map_df.dropna(subset=["iso3"]).copy()

    if "un_location_id" not in map_df.columns:
        raise RuntimeError("un_to_iso3.csv must contain column 'un_location_id'")

    location_ids = map_df["un_location_id"].astype(int).tolist()
    if not location_ids:
        raise RuntimeError("No mapped locations found in un_to_iso3.csv (iso3 filled)")

    return location_ids


def main():
    logger.info("UN ingest started")

    indicators = load_indicator_config()
    location_ids = load_locations()

    start_year = 1970
    end_year = 2030
    page_size = 200
    batch_size = 5

    logger.info(f"Loaded indicators: {len(indicators)}")
    logger.info(f"Loaded locations: {len(location_ids)}")
    logger.info(
        f"Params: start_year={start_year}, end_year={end_year}, "
        f"page_size={page_size}, batch_size={batch_size}"
    )

    engine = get_engine()


    insert_sql = text("""
        insert into raw_ingest (source, request_url, payload_json)
        values (:source, :request_url, cast(:payload_json as jsonb))
    """)

    total_indicators = 0
    total_batches = 0
    total_rows = 0
    failed_requests = 0

    for indicator in indicators:
        indicator_id = indicator["id"]
        indicator_name = indicator["name"]

        logger.info(f"=== Start indicator {indicator_id}: {indicator_name} ===")
        print(f"\n=== Indicator {indicator_id}: {indicator_name} ===")

        indicator_batches = 0
        indicator_rows = 0

        for batch_num, batch in enumerate(chunk_list(location_ids, batch_size), start=1):
            req_url = (
                f"un/data/indicators/{indicator_id}/locations/"
                f"{','.join(map(str, batch))}"
                f"?startYear={start_year}&endYear={end_year}&pageSize={page_size}"
            )

            logger.info(
                f"Request indicator={indicator_id}, batch={batch_num}, "
                f"locations={len(batch)}, url={req_url}"
            )

            try:
                df = get_data(
                    [indicator_id],
                    batch,
                    start=start_year,
                    end=end_year,
                    page_size=page_size
                )

                rows = df.to_dict(orient="records")
                rows_count = len(rows)

                payload = {
                    "indicator_id": indicator_id,
                    "indicator_name": indicator_name,
                    "start_year": start_year,
                    "end_year": end_year,
                    "batch_num": batch_num,
                    "location_ids": batch,
                    "rows": rows
                }

                with engine.begin() as conn:
                    conn.execute(insert_sql, {
                        "source": "un",
                        "request_url": req_url,
                        "payload_json": json.dumps(payload, ensure_ascii=False)
                    })

                indicator_batches += 1
                indicator_rows += rows_count
                total_batches += 1
                total_rows += rows_count

                msg = (
                    f"saved indicator={indicator_id} batch={batch_num} "
                    f"locations={len(batch)} rows={rows_count}"
                )
                logger.info(msg)
                print(msg)

            except Exception as e:
                failed_requests += 1
                logger.exception(
                    f"FAILED indicator={indicator_id}, batch={batch_num}, "
                    f"locations={len(batch)}, url={req_url}, error={e}"
                )
                print(
                    f"FAILED indicator={indicator_id} batch={batch_num} "
                    f"locations={len(batch)} error={e}"
                )
                continue

        logger.info(
            f"=== Done indicator {indicator_id}: batches={indicator_batches}, "
            f"rows={indicator_rows} ==="
        )
        print(
            f"done indicator={indicator_id} ({indicator_name}) "
            f"batches={indicator_batches} rows={indicator_rows}"
        )

        total_indicators += 1

    logger.info(
        f"UN ingest finished | indicators={total_indicators}, "
        f"batches={total_batches}, rows={total_rows}, failed_requests={failed_requests}"
    )
    print(
        f"\nALL DONE | indicators={total_indicators}, "
        f"batches={total_batches}, rows={total_rows}, failed_requests={failed_requests}"
    )
    print(f"Log file: {LOG_FILE}")


if __name__ == "__main__":
    main()