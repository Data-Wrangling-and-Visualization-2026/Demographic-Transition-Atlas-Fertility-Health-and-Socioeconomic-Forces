import os
import requests
import pandas as pd

BASE_URL = "https://population.un.org/dataportalapi/api/v1"

def _get(endpoint, params=None):
    if params is None:
        params = {}

    token = os.getenv("UN_API_TOKEN")  # <-- добавили
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    all_data = []
    url = f"{BASE_URL}/{endpoint}"

    while url:
        r = requests.get(url, params=params, headers=headers, timeout=60)  # <-- headers
        r.raise_for_status()
        resp = r.json()

        if "data" in resp:
            all_data.extend(resp["data"])

        url = resp.get("nextPage", None)
        params = None

    return pd.DataFrame(all_data)

def get_indicators(codes=None):
    """Возвращает список индикаторов (все или по коду)."""
    endpoint = "indicators"
    if codes:
        if isinstance(codes, list):
            codes = ",".join(map(str, codes))
        endpoint += f"/{codes}"
    
    return _get(endpoint)

def get_locations(codes=None):
    """Возвращает список локаций (все или по коду/ISO)."""
    endpoint = "locations"
    if codes:
        if isinstance(codes, list):
            codes = ",".join(map(str, codes))
        endpoint += f"/{codes}"
    
    return _get(endpoint)

def get_data(indicator_ids, location_ids, start=None, end=None, page_size=1000):
    """
    Скачивает данные по индикаторам и локациям.
    Поддерживает несколько индикаторов и локаций.
    """
    if isinstance(indicator_ids, list):
        indicator_ids = ",".join(map(str, indicator_ids))
    if isinstance(location_ids, list):
        location_ids = ",".join(map(str, location_ids))
    
    endpoint = f"data/indicators/{indicator_ids}/locations/{location_ids}"
    
    params = {"pageSize": page_size}
    if start:
        params["startYear"] = start
    if end:
        params["endYear"] = end
    
    return _get(endpoint, params)


if __name__ == "__main__":
    indicators = get_indicators()
    print("Indicators:", len(indicators))
    print(indicators.head())

    locations = get_locations()
    print("Locations:", len(locations))
    print(locations.head())

    df = get_data([44], [428], 1995, 2000)
    print("Data rows:", len(df))
    print(df.head())
