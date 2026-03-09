# Scraper Project

## Структура проекта

- `main.py` - проверка подключения к базам данных
- `scheduler.py` - планировщик запуска пауков
- `scrapy.cfg` - конфигурация Scrapy
- `scraper/` - основной модуль Scrapy
  - `settings.py` - настройки Scrapy
  - `items.py` - модели данных
  - `pipelines.py` - обработка данных (сохранение в MongoDB)
  - `spiders/` - папка с пауками
    - `base_spider.py` - шаблон для создания новых пауков
- `requirements.txt` - зависимости проекта
- `Dockerfile` - инструкция для Docker

## Как запустить тестового паука

```bash
cd scraper
scrapy crawl base_spider