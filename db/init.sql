create table if not exists dim_country (
  iso3 text primary key,
  name text,
  region text,
  income_group text,
  iso2 text
);

create table if not exists dim_indicator (
  source text not null,
  code text not null,
  name text,
  unit text,
  primary key (source, code)
);

create table if not exists raw_ingest (
  id bigserial primary key,
  source text not null,
  fetched_at timestamp not null default now(),
  request_url text not null,
  payload_json jsonb not null
);

create table if not exists fact_indicator_value (
  country_iso3 text not null,
  year int not null,
  source text not null,
  indicator_code text not null,
  value double precision,
  primary key (country_iso3, year, source, indicator_code)
);

CREATE TABLE IF NOT EXISTS fact_context_event (
    event_id BIGSERIAL PRIMARY KEY,
    country_iso3 VARCHAR(3) REFERENCES dim_country(iso3),
    event_date DATE,
    year INT NOT NULL,
    source TEXT NOT NULL,
    event_category TEXT NOT NULL,
    event_subtype TEXT,
    title TEXT NOT NULL,
    summary TEXT,
    mechanism TEXT,
    policy_direction TEXT,
    confidence NUMERIC(4,3),
    tags JSONB DEFAULT '[]'::jsonb,
    url TEXT,
    raw_ingest_id BIGINT REFERENCES raw_ingest(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fact_context_event_country_year
    ON fact_context_event(country_iso3, year);

CREATE INDEX IF NOT EXISTS idx_fact_context_event_source_category
    ON fact_context_event(source, event_category);

CREATE INDEX IF NOT EXISTS idx_fact_context_event_year
    ON fact_context_event(year);

-- (на будущее, спринт 3)
-- create table if not exists fact_event (
--   id bigserial primary key,
--   country_iso3 text not null,
--   date date,
--   year int,
--   category text,
--   summary text,
--   tags jsonb,
--   url text,
--   source text not null default 'gdelt'
-- );