# Data Contract (DWV)

## Общая идея
Мы храним данные в Postgres.
Есть 2 слоя:
1) raw_ingest — сырые ответы API (JSON как пришло)
2) clean (fact_*) — очищенные таблицы, одинаковый формат для всех источников

Единый ключ страны: iso3 (например RUS, USA, DEU).
Единый ключ времени: year (целое число).

---

## Таблица: dim_country
**Зачем:** справочник стран (название, регион и т.п.)
**Ключ:** iso3

Поля:
- iso3 (TEXT, PK) — код страны ISO3 (RUS, USA)
- name (TEXT) — название страны
- region (TEXT) — регион (World Bank)
- income_group (TEXT) — группа дохода (World Bank)
- iso2 (TEXT) — ISO2 (RU, US)

Пример строки:
iso3=RUS, name=Russian Federation, region=Europe & Central Asia, income_group=Upper middle income, iso2=RU

---

## Таблица: dim_indicator
**Зачем:** справочник показателей (чтобы фронт мог показать список индикаторов)
**Ключ:** (source, code)

Поля:
- source (TEXT, PK part) — 'worldbank' или 'un'
- code (TEXT, PK part) — код индикатора (например SP.DYN.TFRT.IN)
- name (TEXT) — название индикатора
- unit (TEXT) — единицы измерения (если есть)

Пример строки:
source=worldbank, code=SP.DYN.TFRT.IN, name=Fertility rate, total (births per woman)

---

## Таблица: raw_ingest
**Зачем:** хранить сырые ответы API (для отладки и аудита)
**Ключ:** id (авто)

Поля:
- id (BIGSERIAL, PK) — уникальный id записи
- source (TEXT) — worldbank/un/gdelt
- fetched_at (TIMESTAMP) — время скачивания
- request_url (TEXT) — какой URL/запрос делали
- payload_json (JSONB) — полный ответ API (как есть)

Пример: payload_json = { ... большой JSON ... }

---

## Таблица: fact_indicator_value
**Зачем:** основная таблица со значениями показателей (в long-формате)
**Ключ:** (country_iso3, year, source, indicator_code)

Поля:
- country_iso3 (TEXT, PK part)
- year (INT, PK part)
- source (TEXT, PK part) — worldbank/un
- indicator_code (TEXT, PK part) — код показателя
- value (DOUBLE PRECISION) — значение (может быть NULL)

Пример строки:
country_iso3=RUS, year=2010, source=worldbank, indicator_code=SP.DYN.TFRT.IN, value=1.56

---

## Таблица: fact_event (появится в спринте 3)
**Зачем:** объясняющие события/новости по стране (из GDELT)
**Ключ:** id

Поля:
- id (BIGSERIAL, PK)
- country_iso3 (TEXT)
- date (DATE) или year (INT)
- category (TEXT) — например 'family_policy', 'healthcare'
- summary (TEXT) — короткое описание
- tags (JSONB) — список тегов/ключевых слов
- url (TEXT) — ссылка на статью/источник
- source (TEXT) — 'gdelt'

Пример:
country_iso3=FRA, date=2015-06-01, category=family_policy, summary="...", url="..."