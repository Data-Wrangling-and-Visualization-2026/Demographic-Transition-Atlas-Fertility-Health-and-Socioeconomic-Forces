import os
import time
import requests
from pymongo import MongoClient

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo:27017")
CH_HOST = os.getenv("CLICKHOUSE_HOST", "clickhouse")
CH_PORT = os.getenv("CLICKHOUSE_HTTP_PORT", "8123")

def check_mongo():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
    client.admin.command("ping")
    print("MongoDB: OK")

def check_clickhouse():
    r = requests.get(f"http://{CH_HOST}:{CH_PORT}/ping", timeout=3)
    if r.text.strip() == "Ok.":
        print("ClickHouse: OK")
    else:
        raise RuntimeError(f"ClickHouse ping unexpected: {r.text}")

if __name__ == "__main__":
    while True:
        try:
            check_mongo()
            check_clickhouse()
        except Exception as e:
            print(" Connection check failed:", e)
        time.sleep(10)
