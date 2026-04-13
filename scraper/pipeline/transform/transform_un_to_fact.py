import json
from sqlalchemy import text
from pipeline.db import get_engine


def safe_int(x):
    try:
        return int(x)
    except (TypeError, ValueError):
        return None


def safe_float(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def row_priority(indicator_id, row):
    """
    Чем меньше число, тем более предпочтительна строка.
    Нужен, чтобы из нескольких строк на страну-год-индикатор
    выбрать один канонический ряд.
    """
    sex_id = row.get("sexId")
    age_id = row.get("ageId")
    category_id = row.get("categoryId")
    variant_id = row.get("variantId")
    estimate_type_id = row.get("estimateTypeId")

    # Всегда предпочитаем model-based estimates и median
    # (но если строка не подходит, просто даём ей плохой приоритет)
    base_penalty = 0
    if estimate_type_id != 1:
        base_penalty += 1000
    if variant_id != 4:
        base_penalty += 100

    # 2,4: family planning indicators
    if indicator_id in {2, 4}:
        # Предпочитаем:
        # sex=2, age=31, estimateType=1, variant=4
        # category 99 лучше, чем 100
        penalty = base_penalty

        if sex_id != 2:
            penalty += 10000
        if age_id != 31:
            penalty += 10000
        if category_id == 99:
            penalty += 1
        elif category_id == 100:
            penalty += 2
        else:
            penalty += 10000

        return penalty

    # 41: Female population of reproductive age
    if indicator_id == 41:
        penalty = base_penalty
        if sex_id != 2:
            penalty += 10000
        if age_id != 31:
            penalty += 10000
        if category_id != 99:
            penalty += 10000
        return penalty

    # 18,50,66,67: общие показатели
    if indicator_id in {18, 50, 66, 67}:
        penalty = base_penalty
        if sex_id != 3:
            penalty += 10000
        if age_id != 188:
            penalty += 10000
        if category_id != 0:
            penalty += 10000
        return penalty

    # 83,86: dependency ratios
    if indicator_id in {83, 86}:
        penalty = base_penalty
        if category_id != 0:
            penalty += 10000

        # Предпочитаем both sexes, потом male, потом female
        if sex_id == 3:
            penalty += 1
        elif sex_id == 1:
            penalty += 2
        elif sex_id == 2:
            penalty += 3
        else:
            penalty += 10000

        return penalty

    # На всякий случай для прочих индикаторов
    return base_penalty + 99999


def main():
    engine = get_engine()

    sel = text("""
        SELECT id, payload_json
        FROM raw_ingest
        WHERE source = 'un'
        ORDER BY id;
    """)

    create_raw_un_sql = text("""
    CREATE TABLE IF NOT EXISTS raw_un_indicator_value (
        country_iso3 TEXT NOT NULL,
        year INT NOT NULL,
        source TEXT NOT NULL,
        indicator_id INT NOT NULL,
        indicator_code TEXT NOT NULL,
        indicator_name TEXT,
        value NUMERIC,
        PRIMARY KEY (country_iso3, year, indicator_id)
    );
    """)

    upsert = text("""
        INSERT INTO raw_un_indicator_value
            (country_iso3, year, source, indicator_id, indicator_code, indicator_name, value)
        VALUES
            (:country_iso3, :year, 'un', :indicator_id, :indicator_code, :indicator_name, :value)
        ON CONFLICT (country_iso3, year, indicator_id) DO UPDATE
        SET
            indicator_code = EXCLUDED.indicator_code,
            indicator_name = EXCLUDED.indicator_name,
            value = EXCLUDED.value
    """)

    scanned = 0
    bad = 0
    skipped_unknown = 0
    inserted = 0

    # Здесь будем копить лучший вариант для каждой комбинации
    # ключ: (iso3, year, indicator_id)
    best_rows = {}

    target_indicators = {2, 4, 18, 41, 50, 66, 67, 83, 86}

    with engine.begin() as conn:
        raws = conn.execute(sel).fetchall()
        conn.execute(create_raw_un_sql)

        for raw_id, payload in raws:
            obj = payload if isinstance(payload, dict) else json.loads(payload)

            indicator_id = obj.get("indicator_id") or obj.get("indicatorId")
            indicator_id = safe_int(indicator_id)

            if indicator_id not in target_indicators:
                skipped_unknown += 1
                continue

            indicator_name = obj.get("indicator_name")
            rows = obj.get("rows", [])

            for r in rows:
                scanned += 1

                row_indicator_id = safe_int(r.get("indicatorId")) or indicator_id
                if row_indicator_id != indicator_id:
                    continue

                iso3 = (r.get("iso3") or "").strip()
                year = safe_int(r.get("timeLabel")) or safe_int(r.get("timeId"))
                value = safe_float(r.get("value"))

                if not iso3 or year is None or value is None:
                    bad += 1
                    continue

                candidate = {
                    "country_iso3": iso3,
                    "year": year,
                    "indicator_id": indicator_id,
                    "indicator_code": f"UN_{indicator_id}",
                    "indicator_name": r.get("indicator") or r.get("indicatorDisplayName") or indicator_name,
                    "value": value,
                    "priority": row_priority(indicator_id, r),
                    "raw_id": raw_id,
                }

                key = (iso3, year, indicator_id)

                if key not in best_rows:
                    best_rows[key] = candidate
                else:
                    current = best_rows[key]
                    # Берём строку с лучшим приоритетом.
                    # Если приоритет одинаковый, берём более поздний raw_id.
                    if (
                        candidate["priority"] < current["priority"]
                        or (
                            candidate["priority"] == current["priority"]
                            and candidate["raw_id"] > current["raw_id"]
                        )
                    ):
                        best_rows[key] = candidate

        batch = []
        for item in best_rows.values():
            batch.append({
                "country_iso3": item["country_iso3"],
                "year": item["year"],
                "indicator_id": item["indicator_id"],
                "indicator_code": item["indicator_code"],
                "indicator_name": item["indicator_name"],
                "value": item["value"],
            })

        if batch:
            conn.execute(upsert, batch)
            inserted = len(batch)

    print(f"scanned raw rows: {scanned}")
    print(f"bad rows: {bad}")
    print(f"skipped payloads outside target indicators: {skipped_unknown}")
    print(f"inserted/updated clean rows: {inserted}")
    print("done: raw_un_indicator_value filled with one canonical row per country-year-indicator.")


if __name__ == "__main__":
    main()