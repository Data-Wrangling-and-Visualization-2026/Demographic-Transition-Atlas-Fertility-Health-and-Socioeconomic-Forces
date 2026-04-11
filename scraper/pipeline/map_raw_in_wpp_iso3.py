from pathlib import Path
import pandas as pd

INPUT_PATH = Path("scraper/data/processed/raw_in_wpp_all_long.csv")
COUNTRIES_PATH = Path("scraper/data/processed/dim_country_export.csv")
OUTPUT_PATH = Path("scraper/data/processed/raw_in_wpp_all_long_mapped.csv")
UNMATCHED_PATH = Path("scraper/data/processed/raw_in_wpp_unmatched_countries.csv")


def normalize_name(name: str) -> str:
    if pd.isna(name):
        return ""

    s = str(name).strip().lower()

    replacements = {
        "bolivia (plurinational state of)": "bolivia",
        "state of palestine": "palestine",
        "united states of america": "united states",

        "yemen": "yemen, rep.",
        "bahamas": "bahamas, the",
        "gambia": "gambia, the",
        "czech republic": "czechia",
        "slovakia": "slovak republic",
        "egypt": "egypt, arab rep.",
        "iran (islamic republic of)": "iran",
        "venezuela (bolivarian republic of)": "venezuela",
        "united republic of tanzania": "tanzania",
        "côte d'ivoire": "cote d'ivoire",
        "viet nam": "vietnam",
        "lao people's democratic republic": "laos",
        "republic of moldova": "moldova",
        "republic of korea": "korea, rep.",
        "democratic people's republic of korea": "korea, dem. people's rep.",
        "swaziland": "eswatini",
        "the former yugoslav rep. of macedonia": "north macedonia",
        "turkey": "turkiye",
        "kyrgyzstan": "kyrgyz republic",
        "cabo verde": "cape verde",
        "brunei darussalam": "brunei",
        "saint kitts and nevis": "st. kitts and nevis",
        "saint lucia": "st. lucia",
        "saint vincent and the grenadines": "st. vincent and the grenadines",
    }

    return replacements.get(s, s)


def main():
    df = pd.read_csv(INPUT_PATH)
    countries = pd.read_csv(COUNTRIES_PATH)

    df["country_name_norm"] = df["country_name"].apply(normalize_name)
    countries["country_name_norm"] = countries["name"].apply(normalize_name)

    mapped = df.merge(
        countries[["iso3", "name", "country_name_norm"]],
        on="country_name_norm",
        how="left",
    )

    mapped["country_iso3"] = mapped["iso3"].combine_first(mapped["country_iso3"])

    unmatched = (
        mapped[mapped["country_iso3"].isna()][["country_name"]]
        .drop_duplicates()
        .sort_values("country_name")
        .copy()
    )

    out = mapped[["year", "country_name", "country_iso3", "feature_code", "feature_value"]].copy()
    out.to_csv(OUTPUT_PATH, index=False)
    unmatched.to_csv(UNMATCHED_PATH, index=False)

    print(f"[saved] {OUTPUT_PATH} rows={len(out)}")
    print(f"[saved] {UNMATCHED_PATH} unmatched={len(unmatched)}")

    if len(unmatched):
        print("\nUNMATCHED:")
        print(unmatched.to_string(index=False))


if __name__ == "__main__":
    main()