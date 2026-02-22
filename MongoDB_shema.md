# Mongo Database Schema

## 1. Database

**Name:** `project_db`  
**Purpose:** Store raw and cleaned demographic data collected from multiple sources (fertility, economic, medical, social, events) for export to ClickHouse.  

---

## 2. Collections

### A. `raw_data`

**Purpose:** Store unprocessed data as it comes from source websites or datasets.  

**Fields:**

| Field            | Type       | Description |
|-----------------|-----------|------------|
| `_id`            | ObjectId  | Unique MongoDB ID |
| `source`         | string    | Source of the data (e.g., UN, World Bank, GDELT, WHO, other sites) |
| `country`        | string    | Country name or ISO code |
| `year`           | int       | Year of the data point |
| `url`            | string    | URL of the data source page |
| `fertility_rate` | string    | Total fertility rate as scraped (may need cleaning) |
| `birth_rate`     | string    | Birth rate per 1,000 population (raw) |
| `population`     | string    | Total population for the year |
| `economic_index` | string    | Raw economic indicator (GDP, GDP per capita, etc.) |
| `medical_index`  | string    | Raw medical indicator (life expectancy, IVF share, abortion rate, etc.) |
| `social_index`   | string    | Raw social indicator (education, social policy metrics, etc.) |
| `events_html`    | string    | Raw HTML/text of events (political reforms, historical events) |
| `scraped_at`     | datetime  | Timestamp of when data was collected |

**Indexes / Uniqueness:**

- Unique key: `country + year + source` → one source per country/year  
- `url` can repeat across different sources  

---

### B. `cleaned_data`

**Purpose:** Store processed, normalized, and enriched demographic data ready for analytics in ClickHouse.  

**Fields:**

| Field              | Type       | Description |
|-------------------|-----------|------------|
| `_id`              | ObjectId  | Unique MongoDB ID |
| `country`          | string    | Country name or ISO code |
| `year`             | int       | Year of the data point |
| `fertility_rate`   | float     | Total fertility rate (children per woman) |
| `birth_rate`       | float     | Birth rate per 1,000 population |
| `population`       | int       | Total population |
| `gdp_per_capita`   | float     | Normalized GDP per capita |
| `health_index`     | float     | Normalized medical indicator (life expectancy, IVF share, abortion rate, etc.) |
| `education_index`  | float     | Normalized social/education index |
| `event_count`      | int       | Number of recorded events for the country/year |
| `events`           | array     | Array of enriched events: [{type, description, date, source}] |
| `scraped_at`       | datetime  | Timestamp when raw data was collected |
| `processed_at`     | datetime  | Timestamp when data was cleaned/enriched |

**Indexes / Uniqueness:**

- Unique key: `country + year` → one record per country/year  
- Aggregated metrics and events  

---

## 3. Explanation of Unique Keys

| Collection | Unique Key | Reason |
|------------|------------|--------|
| `raw_data` | `country + year + source` | Ensure one source is inserted only once per country/year; URL can repeat across sources |
| `cleaned_data` | `country + year` | All metrics aggregated; only one record per country/year |

---

## 4. Connection Info

- **MongoDB URI:** `mongodb://mongo:27017`  
- **Database Name:** `project_db`  
- **Collections:** `raw_data`, `cleaned_data`  

---

## 5. Notes

- `raw_data` contains unprocessed, sometimes incomplete data for debugging and enrichment.  
- `cleaned_data` contains normalized and enriched metrics for analytics and ClickHouse ingestion.  
- Missing values are stored as `null`.  
- Events are structured for filtering by type: healthcare, social policy, conflict, etc.  
