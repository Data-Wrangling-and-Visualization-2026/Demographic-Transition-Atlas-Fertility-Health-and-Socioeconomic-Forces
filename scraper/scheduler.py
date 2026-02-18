import os
import shlex
import subprocess
import logging
from datetime import datetime
from apscheduler.schedulers.blocking import BlockingScheduler

LOG_DIR = os.getenv("LOG_DIR", "/logs")
os.makedirs(LOG_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(LOG_DIR, "scheduler.log"))
    ],
)

SCRAPE_INTERVAL_MINUTES = int(os.getenv("SCRAPE_INTERVAL_MINUTES", "60"))

SCRAPER_COMMAND = os.getenv("SCRAPER_COMMAND", "python main.py")

def run_scraper():
    logging.info(f"Starting scraper: {SCRAPER_COMMAND}")
    try:
        cmd = shlex.split(SCRAPER_COMMAND)
        result = subprocess.run(cmd, capture_output=True, text=True)

        with open(os.path.join(LOG_DIR, "scraper_stdout.log"), "a") as f:
            f.write(f"\n--- {datetime.utcnow().isoformat()}Z ---\n{result.stdout}")

        with open(os.path.join(LOG_DIR, "scraper_stderr.log"), "a") as f:
            f.write(f"\n--- {datetime.utcnow().isoformat()}Z ---\n{result.stderr}")

        logging.info(f"Scraper finished with code={result.returncode}")
    except Exception as e:
        logging.exception(f"Scraper run failed: {e}")

if __name__ == "__main__":
    scheduler = BlockingScheduler(timezone="UTC")

    scheduler.add_job(
        run_scraper,
        trigger="interval",
        minutes=SCRAPE_INTERVAL_MINUTES,
        max_instances=1,
        coalesce=True,
        misfire_grace_time=300,
        next_run_time=datetime.utcnow(),  
    )

    logging.info(f"Scheduler started. Interval = {SCRAPE_INTERVAL_MINUTES} minutes")
    scheduler.start()
