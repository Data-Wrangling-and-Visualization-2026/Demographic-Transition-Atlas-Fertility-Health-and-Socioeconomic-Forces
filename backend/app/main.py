from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.db import engine


app = FastAPI(title="Demographic Transition Atlas API")

# Добавьте это — разрешаем запросы с фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/map")
def get_map_data(
        year: int = Query(..., ge=1960, le=2024),
        indicator: str = Query(..., min_length=1),
        source: str = Query(..., pattern="^(worldbank|un)$"),
        limit: int = Query(500, ge=1, le=2000),
):
    """Get map data for a specific year, indicator, and source."""
    stmt = text("""
                SELECT c.iso3,
                       c.name,
                       fiv.value
                FROM fact_indicator_value fiv
                         JOIN dim_country c ON fiv.country_iso3 = c.iso3
                WHERE fiv.year = :year
                  AND fiv.indicator_code = :indicator
                  AND fiv.source = :source LIMIT :limit
                """)

    try:
        with engine.connect() as conn:
            rows = conn.execute(
                stmt,
                {"year": year, "indicator": indicator, "source": source, "limit": limit}
            ).mappings().all()
        return [dict(row) for row in rows]
    except Exception as exc:
        raise HTTPException(status_code=503, detail="db not available") from exc


@app.get("/db/stats")
def db_stats() -> dict:
    """Get database statistics for the info strip."""
    try:
        with engine.connect() as conn:
            countries = conn.execute(text("SELECT COUNT(*) FROM dim_country")).scalar()
            facts = conn.execute(text("SELECT COUNT(*) FROM fact_indicator_value")).scalar()
            # Временно убираем events, так как таблицы может не быть
            # events = conn.execute(text("SELECT COUNT(*) FROM fact_context_event")).scalar()
            years = conn.execute(text("SELECT COUNT(DISTINCT year) FROM fact_indicator_value")).scalar()
        return {
            "countries_count": countries,
            "fact_indicator_value_count": facts,
            "fact_context_event_count": 0,  # Временно 0
            "indicator_years_count": years,
        }
    except Exception as exc:
        print(f"Error in /db/stats: {exc}")  # Для отладки
        raise HTTPException(status_code=503, detail="db not available") from exc


@app.get("/timeseries")
def get_timeseries(
        country_iso3: str = Query(..., min_length=3, max_length=3),
        indicator: str = Query(..., min_length=1),
        source: str = Query(..., pattern="^(worldbank|un)$"),
) -> dict:
    """Get time series data for a specific country and indicator."""
    stmt = text("""
                SELECT year, value
                FROM fact_indicator_value
                WHERE country_iso3 = :country_iso3
                  AND indicator_code = :indicator
                  AND source = :source
                ORDER BY year
                """)

    try:
        with engine.connect() as conn:
            rows = conn.execute(
                stmt,
                {"country_iso3": country_iso3, "indicator": indicator, "source": source}
            ).mappings().all()
            points = []
            for row in rows:
                if row["value"] is not None:
                    try:
                        points.append({"year": row["year"], "value": float(row["value"])})
                    except (ValueError, TypeError):
                        continue
        return {
            "country_iso3": country_iso3,
            "indicator": indicator,
            "source": source,
            "points": points
        }
    except Exception as exc:
        print(f"Error in /timeseries: {exc}")
        raise HTTPException(status_code=503, detail="db not available") from exc

@app.get("/events")
def get_events(
        country_iso3: str = Query(..., min_length=3, max_length=3),
        limit: int = Query(100, ge=1, le=500),
) -> list[dict]:
    """Get historical events for a specific country."""
    # Временно возвращаем пустой список, пока нет таблицы fact_context_event
    return []

    # Когда таблица появится, раскомментируйте:
    # stmt = text("""
    #     SELECT year, title, summary, source, event_category
    #     FROM fact_context_event
    #     WHERE country_iso3 = :country_iso3
    #     ORDER BY year DESC
    #     LIMIT :limit
    # """)
    #
    # try:
    #     with engine.connect() as conn:
    #         rows = conn.execute(
    #             stmt,
    #             {"country_iso3": country_iso3, "limit": limit}
    #         ).mappings().all()
    #     return [dict(row) for row in rows]
    # except Exception as exc:
    #     raise HTTPException(status_code=503, detail="db not available") from exc