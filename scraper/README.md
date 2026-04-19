# Scraper / Data Pipeline

This directory contains ingestion, transformation, and validation scripts for demographic datasets.

## What is used now

- `scheduler.py` - runs `SCRAPER_COMMAND` on an interval (used by `docker-compose`).
- `main.py` - service connectivity smoke-check command.
- `pipeline/` - World Bank and UN ingestion/transformation scripts.
- `export_pg_tables_docker.py` - optional CSV export from Postgres.
- `data/`, `docs/` - artifacts and documentation for data processing.

## Typical commands

```bash
python scheduler.py
python pipeline/ingest/ingest_wb_countries.py
python pipeline/ingest/ingest_wb_indicators.py
python pipeline/ingest/ingest_wb_raw.py
python pipeline/transform/transform_wb_to_fact.py
python pipeline/ingest/ingest_un_raw.py
python pipeline/transform/transform_un_to_fact.py
python pipeline/transform/load_un_to_marts.py
```
