-- Manual load script for CSV datasets
-- Run with psql (client-side copy):
-- psql -h localhost -p 5432 -U dwv -d dwv -f db/load_manual_csv_tables.sql

-- 1) dim_country_clean
DROP TABLE IF EXISTS dim_country_clean;

CREATE TABLE dim_country_clean (
    iso3 TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT,
    income_group TEXT,
    iso2 TEXT
);

\copy dim_country_clean (iso3, name, region, income_group, iso2) FROM '/Users/sabinaamilova/Downloads/dim_country_clean.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');


-- 2) dim_indicator_enriched
DROP TABLE IF EXISTS dim_indicator_enriched;

CREATE TABLE dim_indicator_enriched (
    source TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    project_label TEXT,
    theme_group TEXT,
    narrative_role TEXT,
    PRIMARY KEY (source, code)
);

\copy dim_indicator_enriched (source, code, name, project_label, theme_group, narrative_role) FROM '/Users/sabinaamilova/Downloads/dim_indicator_enriched.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');


-- 3) atlas_country_year_imputed
DROP TABLE IF EXISTS atlas_country_year_imputed;

CREATE TABLE atlas_country_year_imputed (
    country_iso3 TEXT NOT NULL,
    year INTEGER NOT NULL,
    name TEXT,
    region TEXT,
    income_group TEXT,

    adolescent_fertility DOUBLE PRECISION,
    child_dependency_ratio DOUBLE PRECISION,
    contraceptive_prevalence_modern DOUBLE PRECISION,
    crude_net_migration_rate DOUBLE PRECISION,
    female_labor_force_participation DOUBLE PRECISION,
    female_population_15_49 DOUBLE PRECISION,
    female_secondary_enrollment DOUBLE PRECISION,
    gdp_per_capita DOUBLE PRECISION,
    health_expenditure_pct_gdp DOUBLE PRECISION,
    mean_age_childbearing DOUBLE PRECISION,
    median_age DOUBLE PRECISION,
    population_change DOUBLE PRECISION,
    tfr DOUBLE PRECISION,
    total_dependency_ratio DOUBLE PRECISION,
    unmet_need_family_planning DOUBLE PRECISION,
    urban_population_pct DOUBLE PRECISION,

    PRIMARY KEY (country_iso3, year)
);

\copy atlas_country_year_imputed (country_iso3, year, name, region, income_group, adolescent_fertility, child_dependency_ratio, contraceptive_prevalence_modern, crude_net_migration_rate, female_labor_force_participation, female_population_15_49, female_secondary_enrollment, gdp_per_capita, health_expenditure_pct_gdp, mean_age_childbearing, median_age, population_change, tfr, total_dependency_ratio, unmet_need_family_planning, urban_population_pct) FROM '/Users/sabinaamilova/Downloads/atlas_country_year_imputed.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');

-- Quick checks
SELECT 'dim_country_clean' AS table_name, COUNT(*) AS row_count FROM dim_country_clean
UNION ALL
SELECT 'dim_indicator_enriched', COUNT(*) FROM dim_indicator_enriched
UNION ALL
SELECT 'atlas_country_year_imputed', COUNT(*) FROM atlas_country_year_imputed;
