# Hero frontend

Одностраничный «atlas» в `public/`: глобус (D3), графики и события из API.

## Запуск (рекомендуется для фронта)

Страница и API должны быть с **одного origin** (`http://localhost:8000`), чтобы запросы шли без CORS. Статика подхватывается из `frontend/public`, если репозиторий целиком лежит на диске (см. `backend/app/main.py`).

### 1. Поднять только PostgreSQL (Docker)

Из **корня** репозитория:

```bash
docker compose up -d postgres
```

В `docker-compose` Postgres проброшен на хост как **5433** (чтобы не конфликтовать с локальным Postgres на 5432). С вашего Mac подключайтесь к `127.0.0.1:5433`.

### 2. Backend + hero на вашей машине

**Важно:** команды uvicorn выполняйте **из каталога `backend`**, иначе будет `ModuleNotFoundError: No module named 'app'`.

```bash
cd backend
source .venv/bin/activate
# первый раз: python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
export POSTGRES_HOST=127.0.0.1
export POSTGRES_PORT=5433
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Если очень нужно вызывать из **корня** репозитория (укажите путь к venv):

```bash
export POSTGRES_HOST=127.0.0.1
export POSTGRES_PORT=5433
backend/.venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --app-dir backend
```

Откройте **http://localhost:8000/**

### Вариант: весь стек в Docker

```bash
docker compose up -d --build postgres backend
```

В этом образе **нет** копии `frontend/public`; главная `/` может отдать 404. Для полноценной hero-страницы используйте шаги 1–2 выше.
