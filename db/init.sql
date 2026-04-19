DROP TABLE IF EXISTS dim_country_clean;
DROP TABLE IF EXISTS dim_indicator_enriched;
DROP TABLE IF EXISTS atlas_country_year_imputed;

CREATE TABLE dim_country_clean (
    iso3 TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT,
    income_group TEXT,
    iso2 TEXT
);

CREATE TABLE dim_indicator_enriched (
    source TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    project_label TEXT,
    theme_group TEXT,
    narrative_role TEXT,
    PRIMARY KEY (source, code)
);

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


COPY dim_country_clean
FROM '/data/dim_country_clean.csv'
WITH (FORMAT csv, HEADER true);

COPY dim_indicator_enriched
FROM '/data/dim_indicator_enriched.csv'
WITH (FORMAT csv, HEADER true);

COPY atlas_country_year_imputed
FROM '/data/atlas_country_year_imputed.csv'
WITH (FORMAT csv, HEADER true);


DROP INDEX IF EXISTS idx_country_year;
DROP INDEX IF EXISTS idx_year_name;
DROP INDEX IF EXISTS idx_series_full;

CREATE INDEX idx_country_year
ON atlas_country_year_imputed(country_iso3, year);

CREATE INDEX idx_year_name
ON atlas_country_year_imputed(year, name);

CREATE INDEX idx_series_full
ON atlas_country_year_imputed(region, income_group, year, name);


SELECT 'country' AS table_name, COUNT(*) FROM dim_country_clean
UNION ALL
SELECT 'indicator', COUNT(*) FROM dim_indicator_enriched
UNION ALL
SELECT 'fact', COUNT(*) FROM atlas_country_year_imputed;