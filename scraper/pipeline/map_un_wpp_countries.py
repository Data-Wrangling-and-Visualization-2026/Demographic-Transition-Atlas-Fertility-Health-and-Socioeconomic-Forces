from pathlib import Path
import pandas as pd

INPUT_PATH = Path("scraper/data/processed/un_wpp_legacy_events.csv")
COUNTRIES_PATH = Path("scraper/data/processed/dim_country_export.csv")
OUTPUT_PATH = Path("scraper/data/processed/un_wpp_legacy_events_mapped.csv")
UNMATCHED_PATH = Path("scraper/data/processed/un_wpp_legacy_events_unmatched.csv")


def normalize_name(name: str) -> str:
    if pd.isna(name):
        return ""

    s = str(name).strip().lower()

    replacements = {
        "bolivia (plurinational state of)": "bolivia",
        "iran (islamic republic of)": "iran",
        "syrian arab republic": "syria",
        "venezuela (bolivarian republic of)": "venezuela",
        "united republic of tanzania": "tanzania",
        "democratic republic of the congo": "congo, dem. rep.",
        "cabo verde": "cape verde",
        "viet nam": "vietnam",
        "lao people's democratic republic": "laos",
        "republic of korea": "korea, rep.",
        "democratic people's republic of korea": "korea, dem. people's rep.",
        "republic of moldova": "moldova",
        "brunei darussalam": "brunei",
        "state of palestine": "palestine",
        "micronesia (federated states of)": "micronesia, fed. sts.",

        "bahamas": "bahamas, the",
        "congo": "congo, rep.",
        "cook islands": "cook islands",
        "czech republic": "czechia",
        "côte d'ivoire": "cote d'ivoire",
        "egypt": "egypt, arab rep.",
        "gambia": "gambia, the",
        "holy see": "holy see",
        "kyrgyzstan": "kyrgyz republic",
        "niue": "niue",
        "saint kitts and nevis": "st. kitts and nevis",
        "saint lucia": "st. lucia",
        "saint vincent and the grenadines": "st. vincent and the grenadines",
        "slovakia": "slovak republic",
        "somalia": "somalia",
        "swaziland": "eswatini",
        "the former yugoslav rep. of macedonia": "north macedonia",
        "turkey": "turkiye",
        "yemen": "yemen, rep.",
    }

    return replacements.get(s, s)


def main():
    events_df = pd.read_csv(INPUT_PATH)
    countries_df = pd.read_csv(COUNTRIES_PATH)

    events_df["country_name_norm"] = events_df["country_name"].apply(normalize_name)
    countries_df["country_name_norm"] = countries_df["name"].apply(normalize_name)

    mapped_df = events_df.merge(
        countries_df[["iso3", "name", "country_name_norm"]],
        on="country_name_norm",
        how="left"
    )

    unmatched_df = mapped_df[mapped_df["iso3"].isna()].copy()
    matched_df = mapped_df[mapped_df["iso3"].notna()].copy()

    matched_df.to_csv(OUTPUT_PATH, index=False)
    unmatched_df.to_csv(UNMATCHED_PATH, index=False)

    print(f"[mapped] {len(matched_df)}")
    print(f"[unmatched] {len(unmatched_df)}")
    print(f"[saved] {OUTPUT_PATH}")
    print(f"[saved] {UNMATCHED_PATH}")

    if len(unmatched_df):
        print("\nUNMATCHED COUNTRY NAMES:")
        print(sorted(unmatched_df["country_name"].dropna().unique().tolist())[:100])


if __name__ == "__main__":
    main()