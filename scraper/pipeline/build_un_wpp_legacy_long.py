from pathlib import Path
import sys
import re
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

DATA_DIR = Path("scraper/data/un_wpp")
OUT_DIR = Path("scraper/data/processed")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def is_legacy_file(name: str) -> bool:
    name = name.lower()
    return bool(
        re.match(
            r"desa_pd_(1976|1986|1996|2001|2003|2005|2007|2009|2011|2013)_wppdataset_(fertility|reproductivehealthfamilyplanning)\.xls$",
            name,
        )
    )


def main():
    from scraper.pipeline.sources.un_wpp_legacy_long import load_legacy_file_to_long

    frames = []

    for path in sorted(DATA_DIR.glob("*.xls")):
        if not is_legacy_file(path.name):
            print(f"Skipping {path.name}")
            continue

        print(f"Reading {path.name}")
        long_df = load_legacy_file_to_long(str(path))
        frames.append(long_df)

    if not frames:
        print("No legacy files found.")
        return

    result = pd.concat(frames, ignore_index=True)

    output_path = OUT_DIR / "raw_in_wpp_legacy_long.csv"
    result.to_csv(output_path, index=False)

    print(f"[saved] {output_path} rows={len(result)}")
    print("\nColumns:")
    print(result.columns.tolist())
    print("\nHead:")
    print(result.head(20).to_string())


if __name__ == "__main__":
    main()