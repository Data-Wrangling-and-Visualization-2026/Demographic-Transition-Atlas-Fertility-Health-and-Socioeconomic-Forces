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
- `frontend/` — web interface (interactive atlas)
- `logs/` — pipeline execution logs
- `notebooks/` — data cleaning and exploratory analysis
- `scraper/pipeline/` — data ingestion and transformation (World Bank, UN)
- `docker-compose.yml` — infrastructure setup

## Data sources
- **World Bank API** — country-level indicators (fertility, GDP, health expenditure, etc.)
- **UN Population Data Portal / WPP** — demographic indicators (e.g., mean age of childbearing / maternal age)

## What we have implemented
### Data Pipeline
- Collected data from external sources (World Bank API, UN Population datasets)
- Cleaned and standardized raw datasets into a unified format
- Converted processed data into structured CSV files for loading
### Database Layer
- Designed relational schema for demographic and socioeconomic indicators
- Created dimension tables for country and indicator metadata
- Built a main fact table at the country-year level
- Loaded processed CSV datasets into PostgreSQL
### Backend System
- Implemented REST API using FastAPI
- Provides access to country profiles, time series, and map-ready datasets
- Supports filtering by year, indicator, region, and income group
### Frontend Application
- Interactive web atlas built with Vanilla JavaScript
- Data visualizations implemented using D3.js
- Map-based exploration and time-series analysis
- Cross-country comparison functionality

## Data Flow

1. Scraper collects raw data from external APIs
2. Data is transformed and cleaned
3. Data is loaded into PostgreSQL
4. Backend queries optimized tables
5. Frontend requests data via REST API
6. User interacts with interactive map and charts

## Tech Stack
Backend:
- FastAPI
- SQLAlchemy
- PostgreSQL

Frontend:
- Vanilla JS
- D3.js
- TopoJSON
- Fetch API

Infrastructure:
- Docker
- Docker Compose