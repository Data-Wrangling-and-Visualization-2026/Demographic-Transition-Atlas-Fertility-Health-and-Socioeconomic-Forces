# curl demo (local check)

Преподаватель (или любой человек) может локально поднять проект через Docker и проверить API через `curl`.

---

## 1) Поднять проект (Docker)

В корне репозитория (где `docker-compose.yml`):

```bash
docker compose up -d --build
docker compose ps
```

### Windows (PowerShell)

```
curl.exe http://localhost:8000/health
curl.exe http://localhost:8000/health/db
curl.exe "http://localhost:8000/countries?limit=5"
curl.exe http://localhost:8000/indicators
curl.exe "http://localhost:8000/timeseries?country_iso3=AFG&indicator=SP.DYN.TFRT.IN&source=worldbank"
curl.exe "http://localhost:8000/timeseries?country_iso3=AFG&indicator=UN_2&source=un"
```

### Linux / macOS (bash/zsh)

```
curl http://localhost:8000/health
curl http://localhost:8000/health/db
curl "http://localhost:8000/countries?limit=5"
curl http://localhost:8000/indicators
curl "http://localhost:8000/timeseries?country_iso3=AFG&indicator=SP.DYN.TFRT.IN&source=worldbank"
curl "http://localhost:8000/timeseries?country_iso3=AFG&indicator=UN_2&source=un"
```