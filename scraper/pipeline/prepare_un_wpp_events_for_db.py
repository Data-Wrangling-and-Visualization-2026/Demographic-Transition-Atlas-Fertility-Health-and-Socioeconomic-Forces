from pathlib import Path
import pandas as pd
import json

INPUT_PATH = Path("scraper/data/processed/un_wpp_legacy_events_mapped.csv")
OUTPUT_PATH = Path("scraper/data/processed/un_wpp_legacy_events_for_db.csv")


def main():
    df = pd.read_csv(INPUT_PATH)

    # оставить только сматченные строки
    df = df[df["iso3"].notna()].copy()

    # простые tags
    df["tags"] = df.apply(
        lambda row: json.dumps([row["feature_name"], row["event_category"]]),
        axis=1
    )

    # confidence для rule-based UN events
    df["confidence"] = 0.80

    out = pd.DataFrame({
        "country_iso3": df["iso3"],
        "year": df["revision_year"].astype(int),
        "source": df["source"],
        "event_category": df["event_category"],
        "event_subtype": df["event_subtype"],
        "title": df["title"],
        "summary": df["summary"],
        "mechanism": df["mechanism"],
        "policy_direction": df["policy_direction"],
        "confidence": df["confidence"],
        "tags": df["tags"],
        "url": None,
    })

    out.to_csv(OUTPUT_PATH, index=False)

    print(f"[saved] {OUTPUT_PATH} rows={len(out)}")
    print(out.head(20).to_string())


if __name__ == "__main__":
    main()