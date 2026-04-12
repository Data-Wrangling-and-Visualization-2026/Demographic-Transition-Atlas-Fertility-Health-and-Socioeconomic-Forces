from sqlalchemy import text
from pipeline.db import get_engine


def main():
    engine = get_engine()

    upsert_dim_sql = text("""
        INSERT INTO dim_indicator (source, code, name, unit)
        SELECT DISTINCT
            'un' AS source,
            indicator_code AS code,
            indicator_name AS name,
            NULL AS unit
        FROM raw_un_indicator_value
        WHERE indicator_code IS NOT NULL
        ON CONFLICT (source, code) DO UPDATE
        SET
            name = EXCLUDED.name
    """)

    upsert_fact_sql = text("""
        INSERT INTO fact_indicator_value (
            country_iso3,
            year,
            source,
            indicator_code,
            value
        )
        SELECT
            country_iso3,
            year,
            'un' AS source,
            indicator_code,
            value
        FROM raw_un_indicator_value
        WHERE country_iso3 IS NOT NULL
          AND year IS NOT NULL
          AND indicator_code IS NOT NULL
          AND value IS NOT NULL
        ON CONFLICT (country_iso3, year, source, indicator_code) DO UPDATE
        SET value = EXCLUDED.value
    """)

    count_raw_sql = text("""
        SELECT COUNT(*) FROM raw_un_indicator_value
    """)

    count_dim_sql = text("""
        SELECT COUNT(*) FROM dim_indicator WHERE source = 'un'
    """)

    count_fact_sql = text("""
        SELECT COUNT(*) FROM fact_indicator_value WHERE source = 'un'
    """)

    with engine.begin() as conn:
        raw_cnt = conn.execute(count_raw_sql).scalar_one()
        print(f"raw_un_indicator_value rows: {raw_cnt}")

        conn.execute(upsert_dim_sql)
        dim_cnt = conn.execute(count_dim_sql).scalar_one()
        print(f"dim_indicator UN rows after upsert: {dim_cnt}")

        conn.execute(upsert_fact_sql)
        fact_cnt = conn.execute(count_fact_sql).scalar_one()
        print(f"fact_indicator_value UN rows after upsert: {fact_cnt}")

    print("Done: UN indicators loaded into dim_indicator and fact_indicator_value.")


if __name__ == "__main__":
    main()