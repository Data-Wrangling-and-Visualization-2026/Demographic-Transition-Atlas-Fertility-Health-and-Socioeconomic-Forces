import time
import requests

BASE = "https://api.worldbank.org/v2"

def fetch_all(url: str, params: dict, timeout=180, max_retries=5, sleep_seconds=1.0):
    """
    Скачиваем все страницы World Bank API с ретраями и паузами.
    timeout увеличен, чтобы не падать на медленных ответах.
    """
    p = dict(params)
    p["format"] = "json"
    p.setdefault("per_page", 200)

    def get_with_retry(page_params):
        last_err = None
        for attempt in range(1, max_retries + 1):
            try:
                r = requests.get(url, params=page_params, timeout=timeout)
                r.raise_for_status()
                return r.json()
            except Exception as e:
                last_err = e
                # экспоненциальная пауза: 1s, 2s, 4s...
                time.sleep(sleep_seconds * (2 ** (attempt - 1)))
        raise last_err

    # первая страница: узнаём сколько страниц всего
    data = get_with_retry(p)

    if not isinstance(data, list) or len(data) < 2:
        return []

    meta, rows = data[0], data[1]
    pages = int(meta.get("pages", 1))

    all_rows = list(rows) if rows else []

    for page in range(2, pages + 1):
        p_page = dict(p)
        p_page["page"] = page

        time.sleep(sleep_seconds)  # чтобы не спамить API
        data = get_with_retry(p_page)

        if isinstance(data, list) and len(data) >= 2 and data[1]:
            all_rows.extend(data[1])

        print(f"downloaded page {page}/{pages} total_rows={len(all_rows)}")

    return all_rows

def fetch_countries():
    url = f"{BASE}/country"
    return fetch_all(url, params={})

def fetch_indicator_values(indicator_code: str, date_from=1960, date_to=2024):
    url = f"{BASE}/country/all/indicator/{indicator_code}"
    return fetch_all(url, params={"date": f"{date_from}:{date_to}"})

def iter_pages(url: str, params: dict, timeout=180, max_retries=5, sleep_seconds=1.0):
    """
    Возвращает страницы по очереди: (page_number, total_pages, rows_on_page, request_url)
    """
    import time
    import requests

    p = dict(params)
    p["format"] = "json"
    p.setdefault("per_page", 200)

    def get_with_retry(page_params):
        last_err = None
        for attempt in range(1, max_retries + 1):
            try:
                r = requests.get(url, params=page_params, timeout=timeout)
                r.raise_for_status()
                return r.json(), r.url
            except Exception as e:
                last_err = e
                time.sleep(sleep_seconds * (2 ** (attempt - 1)))
        raise last_err

    data, full_url = get_with_retry(p)
    if not isinstance(data, list) or len(data) < 2:
        return

    meta, rows = data[0], data[1]
    pages = int(meta.get("pages", 1))
    yield 1, pages, (rows or []), full_url

    for page in range(2, pages + 1):
        p_page = dict(p)
        p_page["page"] = page
        time.sleep(sleep_seconds)
        data, full_url = get_with_retry(p_page)
        rows = data[1] if isinstance(data, list) and len(data) >= 2 else []
        yield page, pages, (rows or []), full_url

def iter_indicator_pages(indicator_code: str, date_from=1960, date_to=2024):
    url = f"{BASE}/country/all/indicator/{indicator_code}"
    return iter_pages(url, params={"date": f"{date_from}:{date_to}"})