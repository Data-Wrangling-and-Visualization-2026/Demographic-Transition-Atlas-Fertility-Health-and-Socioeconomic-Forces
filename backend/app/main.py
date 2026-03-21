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
