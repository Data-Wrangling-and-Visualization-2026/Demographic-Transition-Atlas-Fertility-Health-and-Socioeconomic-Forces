# Demographic-Transition-Atlas-Fertility-Health-and-Socioeconomic-Forces
Interactive web atlas for exploring fertility trends across countries and their relationship with socioeconomic and health indicators.

## Live Demo
The application is available online:
https://demographylens.space/

## Overview
DemographyLens is an interactive web atlas designed to explore global fertility dynamics and their relationship with socioeconomic and health indicators.
The platform enables users to analyze how demographic processes evolve across countries and over time, combining data from multiple authoritative sources such as the World Bank and the United Nations. By integrating heterogeneous datasets into a unified analytical model, the project provides a consistent country-year view of key indicators.
Users can navigate through countries, compare trends, and identify significant shifts in fertility patterns. The system is built with a data-engineering-first approach, ensuring transparency through raw data storage, reproducible pipelines, and validated transformations.
The project aims to bridge the gap between raw demographic data and intuitive exploration, supporting research, education, and data-driven insights into population dynamics.

### Features
- Explore countries on an interactive map
- Analyze fertility trends over time  
- View visualizations
- Select time ranges
- Cross-country comparison  

## Local Setup
### Prerequisites
- Docker and Docker Compose
- Git
### Quick Start
1. Clone the repository
```bash
git clone https://github.com/Data-Wrangling-and-Visualization-2026/Demographic-Transition-Atlas-Fertility-Health-and-Socioeconomic-Forces.git
cd Demographic-Transition-Atlas-Fertility-Health-and-Socioeconomic-Forces
```
2. Start all services
```bash
docker compose up -d
```
3. Open the application
- Frontend 
```bash 
cd frontend/public/assets
python -m http.server 3000
```
http://localhost:3000
- Backend
API: http://localhost:8000
Docs: http://localhost:8000/docs
- PgAdmin
http://localhost:5050

## Project Structure
- `backend/` — server-side logic and API
- `db/` — database schema and initialization
- `docs/` — validation reports and analytical artifacts
- `frontend/` — web interface (interactive atlas)
- `logs/` — pipeline execution logs
- `notebooks/` — data cleaning and exploratory analysis
- `scraper/pipeline/` — data ingestion and transformation (World Bank, UN)
- `docker-compose.yml` — infrastructure setup

## Data sources
- **World Bank API** — country-level indicators (fertility, GDP, health expenditure, etc.)
- **UN Population Data Portal / WPP** — demographic indicators (e.g., mean age of childbearing / maternal age)

## What we have implemented

### Infrastructure
- Dockerized environment with **PostgreSQL** (main storage) and **pgAdmin** for GUI inspection.
- SQL schema initialized via `db/init.sql`.

### Database tables
- `dim_country_clean` — country dictionary (ISO3, name, region, income group, ISO2)
- `dim_indicator_enriched` — indicator metadata (source, code, name, project label, theme group, narrative role)
- `atlas_country_year_imputed` — main fact table (country-year level data with socioeconomic, health, demographic indicators)

### World Bank ingestion pipeline (API-first)
- Loaded **217 countries** into `dim_country` (filtered out aggregates).
- Selected an MVP set of World Bank indicators and stored them in `dim_indicator`.
- Downloaded World Bank indicator data **page-by-page** into `raw_ingest` (currently ~696 raw pages).
- Transformed raw pages into the clean fact table `fact_indicator_value` (currently **135,720 rows**).
- Generated validation/EDA reports:
  - `docs/validation_wb.md`
  - `docs/change_points_fertility.csv` (top fertility change points to be used later for GDELT events)

### UN Data Portal integration (multi-source pipeline)
- Implemented UN API client (`get_indicators`, `get_locations`, `get_data`) and country reconciliation support.
- Downloaded UN data in batches and stored **raw payloads** in `raw_ingest` (`source='un'`).
- Transformed UN raw payloads into `fact_indicator_value` (`source='un'`) using an MVP slice (consistent “one value per country-year” logic).
- Result: **~12k cleaned UN rows** in `fact_indicator_value`, demonstrating a working **multi-source** pipeline (World Bank + UN) with unified country-year facts.