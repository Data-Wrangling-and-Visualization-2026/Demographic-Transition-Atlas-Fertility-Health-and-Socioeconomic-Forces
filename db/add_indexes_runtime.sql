-- Safe index migration for an existing production database.
-- Run manually via psql (do not run through init.sql).
--
-- Note:
-- 1) CREATE INDEX CONCURRENTLY keeps write locks minimal.
-- 2) Do not wrap this file in a transaction block.
-- 3) PK(country_iso3, year) already exists, so idx_country_year is redundant.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_year_name
ON atlas_country_year_imputed (year, name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_series_full
ON atlas_country_year_imputed (region, income_group, year, name);

DROP INDEX CONCURRENTLY IF EXISTS idx_country_year;

ANALYZE atlas_country_year_imputed;
