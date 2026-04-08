from pathlib import Path
import pandas as pd

PROCESSED_DIR = Path("scraper/data/processed")


def main():
    fertility_path = PROCESSED_DIR / "un_wpp_legacy_fertility.csv"
    rhfp_path = PROCESSED_DIR / "un_wpp_legacy_rhfp.csv"

    fertility_df = pd.read_csv(fertility_path)
    rhfp_df = pd.read_csv(rhfp_path)

    key_cols = ["country_name", "country_code", "revision_year"]

    keep_fertility = [
        "country_name",
        "country_code",
        "region",
        "development_level",
        "least_developed_country",
        "view_on_fertility_level",
        "policy_on_fertility_level",
        "concern_about_adolescent_fertility",
        "policies_reduce_adolescent_fertility",
        "revision_year",
        "source_file",
    ]

    keep_rhfp = [
        "country_name",
        "country_code",
        "family_planning_support",
        "abortion_grounds",
        "domestic_violence_policies",
        "revision_year",
        "source_file",
    ]

    fertility_df = fertility_df[[c for c in keep_fertility if c in fertility_df.columns]].copy()
    rhfp_df = rhfp_df[[c for c in keep_rhfp if c in rhfp_df.columns]].copy()

    panel_df = fertility_df.merge(
        rhfp_df,
        on=key_cols,
        how="outer",
        suffixes=("_fertility", "_rhfp")
    )

    output_path = PROCESSED_DIR / "un_wpp_legacy_panel.csv"
    panel_df.to_csv(output_path, index=False)

    print(f"[saved] {output_path} rows={len(panel_df)}")
    print("\nCOLUMNS:")
    print(panel_df.columns.tolist())
    print("\nHEAD:")
    print(panel_df.head(10).to_string())


if __name__ == "__main__":
    main()