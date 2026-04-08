from fastapi import FastAPI, HTTPException, Query
from sqlalchemy import text

from app.db import engine


app = FastAPI(title="Demographic Transition Atlas API")


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe for container orchestration."""
    return {"status": "ok"}


@app.get("/health/db")
def health_db() -> dict[str, str]:
    """Database connectivity probe (SELECT 1)."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"db": "ok"}
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=503, detail="db not available") from exc


@app.get("/countries")
def list_countries(
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[dict]:
    """Return paged countries from dim_country."""
    stmt = text(
        """
        SELECT iso3, name, region, income_group, iso2
        FROM dim_country
        ORDER BY iso3
        LIMIT :limit OFFSET :offset
        """
    )

    try:
        with engine.connect() as conn:
            rows = conn.execute(stmt, {"limit": limit, "offset": offset}).mappings().all()
        return [dict(row) for row in rows]
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=503, detail="db not available") from exc


@app.get("/indicators")
def list_indicators() -> list[str]:
    """Return combined indicator codes from World Bank and UN sources."""
    stmt_wb = text("""SELECT code FROM dim_indicator WHERE source = 'worldbank'""")
    stmt_un = text(
        """
        SELECT DISTINCT indicator_code AS code
        FROM fact_indicator_value
        WHERE source = 'un'
        """
    )

    try:
        with engine.connect() as conn:
            wb_codes = conn.execute(stmt_wb).scalars().all()
            un_codes = conn.execute(stmt_un).scalars().all()
        combined = sorted(set(wb_codes + un_codes))
        return combined
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=503, detail="db not available") from exc


@app.get("/timeseries")
def timeseries(
    country_iso3: str = Query(..., min_length=3, max_length=3),
    indicator: str = Query(..., min_length=1),
    source: str = Query(..., min_length=1),
) -> dict:
    """
    Return time-series points for one country + indicator from fact_indicator_value.
    If no data -> points=[] (no errors).
    """
    stmt = text(
        """
        SELECT year, value
        FROM fact_indicator_value
        WHERE country_iso3 = :iso3
          AND source = :source
          AND indicator_code = :indicator
        ORDER BY year
        """
    )

    try:
        with engine.connect() as conn:
            rows = conn.execute(
                stmt,
                {"iso3": country_iso3.upper(), "source": source, "indicator": indicator},
            ).mappings().all()

        points = [{"year": int(r["year"]), "value": r["value"]} for r in rows]

        return {
            "country_iso3": country_iso3.upper(),
            "source": source,
            "indicator": indicator,
            "points": points,
        }
    except Exception as exc:  # pragma: no cover
        # Важно: не падать 500 на пустых данных; 500 только если реально DB сломалась
        raise HTTPException(status_code=503, detail="db not available") from exc

@app.get("/events")
def list_events(
    country_iso3: str | None = Query(None, min_length=3, max_length=3),
    from_year: int | None = Query(None, ge=1900, le=2100),
    to_year: int | None = Query(None, ge=1900, le=2100),
    category: str | None = Query(None, min_length=1),
    source: str | None = Query(None, min_length=1),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
) -> list[dict]:
    """
    Return policy/context events from fact_context_event with optional filters.
    """
    conditions = []
    params: dict = {"limit": limit, "offset": offset}

    if country_iso3:
        conditions.append("country_iso3 = :country_iso3")
        params["country_iso3"] = country_iso3.upper()

    if from_year is not None:
        conditions.append('"year" >= :from_year')
        params["from_year"] = from_year

    if to_year is not None:
        conditions.append('"year" <= :to_year')
        params["to_year"] = to_year

    if category:
        conditions.append("event_category = :category")
        params["category"] = category

    if source:
        conditions.append("source = :source")
        params["source"] = source

    where_sql = ""
    if conditions:
        where_sql = "WHERE " + " AND ".join(conditions)

    stmt = text(
        f"""
        SELECT
            country_iso3,
            "year",
            source,
            event_category,
            event_subtype,
            title,
            summary,
            mechanism,
            policy_direction,
            confidence,
            tags,
            url
        FROM fact_context_event
        {where_sql}
        ORDER BY country_iso3, "year", event_category, event_subtype
        LIMIT :limit OFFSET :offset
        """
    )

    try:
        with engine.connect() as conn:
            rows = conn.execute(stmt, params).mappings().all()
        return [dict(row) for row in rows]
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=503, detail="db not available") from exc

@app.get("/help")
def help_route() -> dict:
    return {
        "endpoints": {
            "health": "/health",
            "health_db": "/health/db",
            "countries": "/countries?limit=20&offset=0",
            "indicators": "/indicators",
            "timeseries": "/timeseries?country_iso3=AFG&indicator=SP.DYN.TFRT.IN&source=worldbank",
            "events": "/events?country_iso3=AFG&source=un_wpp",
            "db_info": "/db/info",
            "db_stats": "/db/stats",
            "map": "/map?year=2010&indicator=SP.DYN.TFRT.IN&source=worldbank",
            "rank": "/rank?year=2010&indicator=SP.DYN.TFRT.IN&source=worldbank&limit=20&order=desc",
            "compare": "/compare?countries=AFG,DZA,ALB&indicator=SP.DYN.TFRT.IN&source=worldbank",
        }
    }

@app.get("/db/stats")
def db_stats() -> dict:
    """
    Return row counts and distinct counts useful for demo/debug.
    """
    stmt = text(
        """
        SELECT
            (SELECT COUNT(*) FROM dim_country) AS countries_count,
            (SELECT COUNT(DISTINCT iso3) FROM dim_country) AS distinct_country_iso3_count,
            (SELECT COUNT(*) FROM dim_indicator) AS indicators_count,
            (SELECT COUNT(*) FROM raw_ingest) AS raw_ingest_count,
            (SELECT COUNT(*) FROM fact_indicator_value) AS fact_indicator_value_count,
            (SELECT COUNT(DISTINCT country_iso3) FROM fact_indicator_value) AS indicator_countries_count,
            (SELECT COUNT(DISTINCT year) FROM fact_indicator_value) AS indicator_years_count,
            (SELECT COUNT(DISTINCT indicator_code) FROM fact_indicator_value) AS indicator_codes_count,
            (SELECT COUNT(*) FROM fact_context_event) AS fact_context_event_count,
            (SELECT COUNT(DISTINCT country_iso3) FROM fact_context_event) AS event_countries_count,
            (SELECT COUNT(DISTINCT year) FROM fact_context_event) AS event_years_count,
            (SELECT COUNT(DISTINCT event_category) FROM fact_context_event) AS event_categories_count
        """
    )

    try:
        with engine.connect() as conn:
            row = conn.execute(stmt).mappings().one()
        return dict(row)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=503, detail="db not available") from exc

@app.get("/map")
def map_values(
    year: int = Query(..., ge=1900, le=2100),
    indicator: str = Query(..., min_length=1),
    source: str = Query(..., min_length=1),
    limit: int = Query(300, ge=1, le=500),
) -> list[dict]:
    """
    Return one value per country for a given year/indicator/source.
    Useful for map layers or choropleth input.
    """
    stmt = text(
        """
        SELECT
            c.iso3,
            c.name,
            c.region,
            c.income_group,
            v.year,
            v.value
        FROM fact_indicator_value v
        JOIN dim_country c
          ON c.iso3 = v.country_iso3
        WHERE v.year = :year
          AND v.indicator_code = :indicator
          AND v.source = :source
          AND v.value IS NOT NULL
        ORDER BY c.iso3
        LIMIT :limit
        """
    )

    try:
        with engine.connect() as conn:
            rows = conn.execute(
                stmt,
                {
                    "year": year,
                    "indicator": indicator,
                    "source": source,
                    "limit": limit,
                },
            ).mappings().all()
        return [dict(row) for row in rows]
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=503, detail="db not available") from exc

