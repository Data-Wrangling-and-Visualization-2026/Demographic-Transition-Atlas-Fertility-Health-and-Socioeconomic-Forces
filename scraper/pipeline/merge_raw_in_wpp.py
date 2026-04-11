from pathlib import Path
import pandas as pd

LEGACY_PATH = Path("scraper/data/processed/raw_in_wpp_legacy_long.csv")
MODERN_PATH = Path("scraper/data/processed/raw_in_wpp_modern_long.csv")
OUT_PATH = Path("scraper/data/processed/raw_in_wpp_all_long.csv")


def main():
    legacy = pd.read_csv(LEGACY_PATH)
    modern = pd.read_csv(MODERN_PATH)

    expected_cols = ["year", "country_name", "country_iso3", "feature_code", "feature_value"]
    legacy = legacy[expected_cols].copy()
    modern = modern[expected_cols].copy()

    df = pd.concat([legacy, modern], ignore_index=True)

    df["country_name"] = df["country_name"].astype(str).str.strip()
    df["feature_code"] = df["feature_code"].astype(str).str.strip()
    df["feature_value"] = df["feature_value"].astype(str).str.strip()

    # пустые значения выкинуть
    df = df[df["country_name"] != ""].copy()
    df = df[df["feature_code"] != ""].copy()
    df = df[df["feature_value"] != ""].copy()
    df = df[df["feature_value"].str.lower() != "nan"].copy()

    # убрать точные дубли
    df = df.drop_duplicates().copy()

    df.to_csv(OUT_PATH, index=False)

    print(f"[saved] {OUT_PATH} rows={len(df)}")
    print("\nYears:")
    print(sorted(df["year"].dropna().unique().tolist()))
    print("\nFeatures:")
    print(sorted(df["feature_code"].dropna().unique().tolist()))
    print("\nHead:")
    print(df.head(20).to_string())


if __name__ == "__main__":
    main()