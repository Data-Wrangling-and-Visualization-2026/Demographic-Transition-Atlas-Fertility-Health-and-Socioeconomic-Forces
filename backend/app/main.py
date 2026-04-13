from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException, Path, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.db import engine


app = FastAPI(title="Demographic Transition Atlas API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


INDICATORS: dict[str, dict[str, str]] = {
    "tfr": {
        "label": "Total fertility rate",
        "unit": "births per woman",
        "theme": "fertility",
    },
    "adolescent_fertility": {
        "label": "Adolescent fertility rate",
        "unit": "births per 1,000 women ages 15-19",
        "theme": "fertility",
    },
    "gdp_per_capita": {
        "label": "GDP per capita",
        "unit": "current US$",
        "theme": "economy",
    },
    "female_secondary_enrollment": {
        "label": "Female secondary enrollment",
        "unit": "% gross",
        "theme": "education",
    },
    "female_labor_force_participation": {
        "label": "Female labor force participation",
        "unit": "% ages 15+",
        "theme": "labor",
    },
    "urban_population_pct": {
        "label": "Urban population",
        "unit": "% of total population",
        "theme": "urbanization",
    },
    "median_age": {
        "label": "Median age",
        "unit": "years",
        "theme": "demography",
    },
    "mean_age_childbearing": {
        "label": "Mean age at childbearing",
        "unit": "years",
        "theme": "demography",
    },
    "health_expenditure_pct_gdp": {
        "label": "Health expenditure",
        "unit": "% of GDP",
        "theme": "health",
    },
    "unmet_need_family_planning": {
        "label": "Unmet need for family planning",
        "unit": "% of married women ages 15-49",
        "theme": "health",
    },
    "contraceptive_prevalence_modern": {
        "label": "Contraceptive prevalence (modern)",
        "unit": "% women ages 15-49",
        "theme": "health",
    },
    "child_dependency_ratio": {
        "label": "Child dependency ratio",
        "unit": "dependents per 100 working-age",
        "theme": "demography",
    },
    "total_dependency_ratio": {
        "label": "Total dependency ratio",
        "unit": "dependents per 100 working-age",
        "theme": "demography",
    },
    "population_change": {
        "label": "Population change",
        "unit": "annual absolute change",
        "theme": "demography",
    },
    "crude_net_migration_rate": {
        "label": "Crude net migration rate",
        "unit": "per 1,000 population",
        "theme": "demography",
    },
    "female_population_15_49": {
        "label": "Female population ages 15-49",
        "unit": "persons",
        "theme": "demography",
    },
}

DEFAULT_PANEL_INDICATORS = [
    "tfr",
    "adolescent_fertility",
    "gdp_per_capita",
    "female_secondary_enrollment",
]


def _fail_invalid_indicator(indicator: str) -> None:
    if indicator not in INDICATORS:
        raise HTTPException(
            status_code=400,
            detail={
                "message": f"Unknown indicator: {indicator}",
                "allowed_indicators": sorted(INDICATORS.keys()),
            },
        )


def _rows_to_dict(rows: list[Any]) -> list[dict[str, Any]]:
    return [dict(row) for row in rows]


def _to_float_or_none(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db")
def health_db() -> dict[str, str]:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"db": "ok"}
    except SQLAlchemyError as exc:  # pragma: no cover
        raise HTTPException(status_code=503, detail="db not available") from exc


@app.get("/atlas/meta")
def atlas_meta() -> dict[str, Any]:
    stmt = text(
        """
        SELECT
            MIN(year) AS min_year,
            MAX(year) AS max_year,
            COUNT(*) AS rows_count,
            COUNT(DISTINCT country_iso3) AS countries_count
        FROM atlas_country_year_imputed
        """
    )
    regions_stmt = text(
        """
        SELECT DISTINCT region
        FROM atlas_country_year_imputed
        WHERE region IS NOT NULL
        ORDER BY region
        """
    )
    income_stmt = text(
        """
        SELECT DISTINCT income_group
        FROM atlas_country_year_imputed
        WHERE income_group IS NOT NULL
        ORDER BY income_group
        """
    )

    try:
        with engine.connect() as conn:
            base = conn.execute(stmt).mappings().one()
            regions = conn.execute(regions_stmt).scalars().all()
            income_groups = conn.execute(income_stmt).scalars().all()

        return {
            "min_year": base["min_year"],
            "max_year": base["max_year"],
            "rows_count": base["rows_count"],
            "countries_count": base["countries_count"],
            "regions": regions,
            "income_groups": income_groups,
        }
    except SQLAlchemyError as exc:  # pragma: no cover
        raise HTTPException(status_code=503, detail="db not available") from exc


@app.get("/countries")
def list_countries(
    region: str | None = Query(None),
    income_group: str | None = Query(None),
    search: str | None = Query(None, min_length=1),
    limit: int = Query(500, ge=1, le=2000),
    offset: int = Query(0, ge=0),
) -> list[dict[str, Any]]:
    stmt = text(
        """
        WITH latest AS (
            SELECT DISTINCT ON (country_iso3)
                country_iso3 AS iso3,
                name,
                region,
                income_group
            FROM atlas_country_year_imputed
            WHERE country_iso3 IS NOT NULL
              AND country_iso3 <> ''
            ORDER BY country_iso3, year DESC
        )
        SELECT iso3, name, region, income_group
        FROM latest
        WHERE (:region IS NULL OR region = :region)
          AND (:income_group IS NULL OR income_group = :income_group)
          AND (
              :search_pattern IS NULL
              OR name ILIKE :search_pattern
              OR iso3 ILIKE :search_pattern
          )
        ORDER BY name
        LIMIT :limit OFFSET :offset
        """
    )

    search_pattern = f"%{search.strip()}%" if search else None

    try:
        with engine.connect() as conn:
            rows = conn.execute(
                stmt,
                {
                    "region": region,
                    "income_group": income_group,
                    "search_pattern": search_pattern,
                    "limit": limit,
                    "offset": offset,
                },
            ).mappings().all()
        return _rows_to_dict(rows)
    except SQLAlchemyError as exc:  # pragma: no cover
        raise HTTPException(status_code=503, detail="db not available") from exc


@app.get("/indicators")
def list_indicators() -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []

    try:
        with engine.connect() as conn:
            for code, meta in INDICATORS.items():
                stmt = text(
                    f"""
                    SELECT
                        COUNT({code}) AS non_null_points,
                        COUNT(DISTINCT country_iso3) FILTER (WHERE {code} IS NOT NULL) AS countries_with_data,
                        MIN(year) FILTER (WHERE {code} IS NOT NULL) AS min_year,
                        MAX(year) FILTER (WHERE {code} IS NOT NULL) AS max_year,
                        MIN({code}) AS min_value,
                        MAX({code}) AS max_value
                    FROM atlas_country_year_imputed
                    """
                )
                stats = conn.execute(stmt).mappings().one()
                out.append(
                    {
                        "code": code,
                        "label": meta["label"],
                        "unit": meta["unit"],
                        "theme": meta["theme"],
                        "non_null_points": stats["non_null_points"],
                        "countries_with_data": stats["countries_with_data"],
                        "min_year": stats["min_year"],
                        "max_year": stats["max_year"],
                        "min_value": _to_float_or_none(stats["min_value"]),
                        "max_value": _to_float_or_none(stats["max_value"]),
                    }
                )
        return out
    except SQLAlchemyError as exc:  # pragma: no cover
        raise HTTPException(status_code=503, detail="db not available") from exc


def _query_map_rows(
    year: int,
    indicator: str,
    region: str | None,
    income_group: str | None,
) -> list[dict[str, Any]]:
    stmt = text(
        f"""
        SELECT
            country_iso3 AS iso3,
            name,
            region,
            income_group,
            {indicator} AS value
        FROM atlas_country_year_imputed
        WHERE year = :year
          AND {indicator} IS NOT NULL
          AND (:region IS NULL OR region = :region)
          AND (:income_group IS NULL OR income_group = :income_group)
        ORDER BY name
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(
            stmt,
            {
                "year": year,
                "region": region,
                "income_group": income_group,
            },
        ).mappings().all()
    return _rows_to_dict(rows)


@app.get("/map-data")
def get_map_data(
    year: int = Query(..., ge=1900, le=2100),
    indicator: str = Query(..., min_length=1),
    region: str | None = Query(None),
    income_group: str | None = Query(None),
) -> dict[str, Any]:
    _fail_invalid_indicator(indicator)

    try:
        items = _query_map_rows(
            year=year,
            indicator=indicator,
            region=region,
            income_group=income_group,
        )
        values = [float(r["value"]) for r in items if r.get("value") is not None]
        return {
            "year": year,
            "indicator": indicator,
            "indicator_meta": INDICATORS[indicator],
            "filters": {"region": region, "income_group": income_group},
            "rows": items,
            "summary": {
                "countries_with_data": len(items),
                "min_value": min(values) if values else None,
                "max_value": max(values) if values else None,
            },
        }
    except SQLAlchemyError as exc:  # pragma: no cover
        raise HTTPException(status_code=503, detail="db not available") from exc


@app.get("/country/{iso3}/profile")
def country_profile(
    iso3: str = Path(..., min_length=3, max_length=3),
    year: int | None = Query(None, ge=1900, le=2100),
) -> dict[str, Any]:
    iso3 = iso3.upper()

    if year is None:
        row_stmt = text(
            """
            SELECT
                country_iso3,
                year,
                name,
                region,
                income_group,
                adolescent_fertility,
                child_dependency_ratio,
                contraceptive_prevalence_modern,
                crude_net_migration_rate,
                female_labor_force_participation,
                female_population_15_49,
                female_secondary_enrollment,
                gdp_per_capita,
                health_expenditure_pct_gdp,
                mean_age_childbearing,
                median_age,
                population_change,
                tfr,
                total_dependency_ratio,
                unmet_need_family_planning,
                urban_population_pct
            FROM atlas_country_year_imputed
            WHERE country_iso3 = :iso3
            ORDER BY year DESC
            LIMIT 1
            """
        )
    else:
        row_stmt = text(
            """
            SELECT
                country_iso3,
                year,
                name,
                region,
                income_group,
                adolescent_fertility,
                child_dependency_ratio,
                contraceptive_prevalence_modern,
                crude_net_migration_rate,
                female_labor_force_participation,
                female_population_15_49,
                female_secondary_enrollment,
                gdp_per_capita,
                health_expenditure_pct_gdp,
                mean_age_childbearing,
                median_age,
                population_change,
                tfr,
                total_dependency_ratio,
                unmet_need_family_planning,
                urban_population_pct
            FROM atlas_country_year_imputed
            WHERE country_iso3 = :iso3
              AND year = :year
            LIMIT 1
            """
        )

    range_stmt = text(
        """
        SELECT MIN(year) AS min_year, MAX(year) AS max_year
        FROM atlas_country_year_imputed
        WHERE country_iso3 = :iso3
        """
    )

    try:
        with engine.connect() as conn:
            params: dict[str, Any] = {"iso3": iso3}
            if year is not None:
                params["year"] = year
            row = conn.execute(row_stmt, params).mappings().first()
            if row is None:
                raise HTTPException(status_code=404, detail=f"Country data not found for {iso3}")
            year_range = conn.execute(range_stmt, {"iso3": iso3}).mappings().one()

        values = {k: _to_float_or_none(row[k]) for k in INDICATORS if k in row}
        return {
            "iso3": row["country_iso3"],
            "name": row["name"],
            "region": row["region"],
            "income_group": row["income_group"],
            "selected_year": row["year"],
            "year_range": {
                "min": year_range["min_year"],
                "max": year_range["max_year"],
            },
            "values": values,
        }
    except HTTPException:
        raise
    except SQLAlchemyError as exc:  # pragma: no cover
        raise HTTPException(status_code=503, detail="db not available") from exc


@app.get("/country/{iso3}/timeseries")
def country_timeseries(
    iso3: str = Path(..., min_length=3, max_length=3),
    indicators: str | None = Query(None, description="Comma-separated indicator list"),
) -> dict[str, Any]:
    iso3 = iso3.upper()
    selected = (
        [x.strip() for x in indicators.split(",") if x.strip()]
        if indicators
        else list(DEFAULT_PANEL_INDICATORS)
    )
    if not selected:
        selected = list(DEFAULT_PANEL_INDICATORS)

    invalid = [code for code in selected if code not in INDICATORS]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail={
                "message": f"Unknown indicators: {', '.join(invalid)}",
                "allowed_indicators": sorted(INDICATORS.keys()),
            },
        )

    cols = ", ".join(selected)
    stmt = text(
        f"""
        SELECT year, {cols}
        FROM atlas_country_year_imputed
        WHERE country_iso3 = :iso3
        ORDER BY year
        """
    )
    country_stmt = text(
        """
        SELECT DISTINCT ON (country_iso3)
            country_iso3 AS iso3,
            name,
            region,
            income_group
        FROM atlas_country_year_imputed
        WHERE country_iso3 = :iso3
        ORDER BY country_iso3, year DESC
        """
    )

    try:
        with engine.connect() as conn:
            country = conn.execute(country_stmt, {"iso3": iso3}).mappings().first()
            if country is None:
                raise HTTPException(status_code=404, detail=f"Country data not found for {iso3}")
            rows = conn.execute(stmt, {"iso3": iso3}).mappings().all()

        series: dict[str, list[dict[str, float | int]]] = {code: [] for code in selected}
        for row in rows:
            for code in selected:
                value = _to_float_or_none(row[code])
                if value is None:
                    continue
                series[code].append({"year": int(row["year"]), "value": value})

        return {
            "iso3": country["iso3"],
            "name": country["name"],
            "region": country["region"],
            "income_group": country["income_group"],
            "series": series,
            "indicators": [
                {"code": code, **INDICATORS[code]}
                for code in selected
            ],
        }
    except HTTPException:
        raise
    except SQLAlchemyError as exc:  # pragma: no cover
        raise HTTPException(status_code=503, detail="db not available") from exc


@app.get("/regions/summary")
def regions_summary(
    year: int = Query(..., ge=1900, le=2100),
    indicator: str = Query(...),
    income_group: str | None = Query(None),
) -> dict[str, Any]:
    _fail_invalid_indicator(indicator)

    stmt = text(
        f"""
        SELECT
            region,
            COUNT(*) AS countries_with_data,
            AVG({indicator}) AS avg_value,
            MIN({indicator}) AS min_value,
            MAX({indicator}) AS max_value
        FROM atlas_country_year_imputed
        WHERE year = :year
          AND {indicator} IS NOT NULL
          AND region IS NOT NULL
          AND (:income_group IS NULL OR income_group = :income_group)
        GROUP BY region
        ORDER BY avg_value DESC
        """
    )

    try:
        with engine.connect() as conn:
            rows = conn.execute(stmt, {"year": year, "income_group": income_group}).mappings().all()

        out = []
        for row in rows:
            out.append(
                {
                    "region": row["region"],
                    "countries_with_data": int(row["countries_with_data"]),
                    "avg_value": _to_float_or_none(row["avg_value"]),
                    "min_value": _to_float_or_none(row["min_value"]),
                    "max_value": _to_float_or_none(row["max_value"]),
                }
            )

        return {
            "year": year,
            "indicator": indicator,
            "indicator_meta": INDICATORS[indicator],
            "income_group_filter": income_group,
            "rows": out,
        }
    except SQLAlchemyError as exc:  # pragma: no cover
        raise HTTPException(status_code=503, detail="db not available") from exc


@app.get("/db/stats")
def db_stats() -> dict[str, Any]:
    try:
        with engine.connect() as conn:
            result = conn.execute(
                text(
                    """
                    SELECT
                        COUNT(*) AS rows_count,
                        COUNT(DISTINCT country_iso3) AS countries_count,
                        COUNT(DISTINCT year) AS years_count,
                        MIN(year) AS min_year,
                        MAX(year) AS max_year
                    FROM atlas_country_year_imputed
                    """
                )
            ).mappings().one()
        return {
            "countries_count": result["countries_count"],
            "fact_indicator_value_count": result["rows_count"],
            "fact_context_event_count": 0,
            "indicator_years_count": result["years_count"],
            "min_year": result["min_year"],
            "max_year": result["max_year"],
        }
    except SQLAlchemyError as exc:  # pragma: no cover
        raise HTTPException(status_code=503, detail="db not available") from exc


@app.get("/map")
def map_legacy_alias(
    year: int = Query(..., ge=1900, le=2100),
    indicator: str = Query(...),
    source: str | None = Query(None),
    limit: int = Query(2000, ge=1, le=5000),
) -> list[dict[str, Any]]:
    """
    Legacy compatibility endpoint.
    `source` is ignored because atlas_country_year_imputed is already harmonized.
    """
    _ = source
    _fail_invalid_indicator(indicator)
    try:
        rows = _query_map_rows(
            year=year,
            indicator=indicator,
            region=None,
            income_group=None,
        )
        return rows[:limit]
    except SQLAlchemyError as exc:  # pragma: no cover
        raise HTTPException(status_code=503, detail="db not available") from exc
