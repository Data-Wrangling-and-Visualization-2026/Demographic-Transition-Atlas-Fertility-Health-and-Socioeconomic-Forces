# Demographic-Transition-Atlas-Fertility-Health-and-Socioeconomic-Forces

## Idea (Elevator pitch)
We are building an interactive web atlas to explore how fertility changes over time across countries and how it relates to socioeconomic and health indicators.  
The app will let users select a country or a world map view, choose a year and indicators, and compare time-series trends. In the final stage we will add an “event layer” (news/policy context) to help explain major changes using AI-assisted parsing.

## Data sources 
- **World Bank API** — country-level indicators (fertility, GDP, health expenditure, etc.)
- **UN Population Data Portal / WPP** — demographic indicators (e.g., mean age of childbearing / maternal age)
- **GDELT** — news/event context for selected country-year “change points”

## What we have implemented 
### Infrastructure
- Dockerized environment with **PostgreSQL** (main storage) and **pgAdmin** for GUI inspection.
- SQL schema initialized via `db/init.sql`.

### Database tables
- `dim_country` — country dictionary (ISO3, name, region, income group)
- `dim_indicator` — indicator dictionary (source, code, name)
- `raw_ingest` — raw API payloads (JSONB) for provenance and debugging
- `fact_indicator_value` — cleaned long-format table: (country_iso3, year, source, indicator_code, value)

### World Bank ingestion pipeline (API-first)
- Loaded **217 countries** into `dim_country` (filtered out aggregates).
- Selected an MVP set of World Bank indicators and stored them in `dim_indicator`.
- Downloaded World Bank indicator data **page-by-page** into `raw_ingest` (currently ~696 raw pages).
- Transformed raw pages into the clean fact table `fact_indicator_value` (currently **135,720 rows**).
- Generated validation/EDA reports:
  - `docs/validation_wb.md`
  - `docs/change_points_fertility.csv` (top fertility change points to be used later for GDELT events)

## Project structure (high level)
- `docker-compose.yml` — services (postgres, pgadmin, scraper container)
- `db/init.sql` — database schema
- `scraper/pipeline/` — ingestion + transforms (WB now; UN/GDELT next)
- `docs/` — reports and audit-friendly artifacts (validation, change points, etc.)

## How to run (local)
### 1) Start services
```bash
docker compose up -d
```

### Open http://localhost:5050
- Register server:
- Host: postgres
- Port: 5432
- DB: dwv
- User: dwv
- Password: dwv
