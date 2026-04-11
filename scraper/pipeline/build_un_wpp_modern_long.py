from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

OUT_DIR = Path("scraper/data/processed")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def main():
    from scraper.pipeline.sources.un_wpp_modern_long import load_modern_files_to_long

    file_map = {
        "2015": "scraper/data/un_wpp/undesa_pd_2015_population_policies_fertility_fp_rh_dataset.xls",
        "2017": "scraper/data/un_wpp/undesa_pd_2017_abortion_laws_policies_country_dataset.xlsx",
        "2019": "scraper/data/un_wpp/desa_pd_2019_fertility_family_planning_reproductive_health_country_data (1).xlsx",
        "2021": "scraper/data/un_wpp/desa_unpd_2021_13_inquiry_reproductive_health_country (3).xlsx",
    }

    df = load_modern_files_to_long(file_map)

    out = OUT_DIR / "raw_in_wpp_modern_long.csv"
    df.to_csv(out, index=False)

    print(f"[saved] {out} rows={len(df)}")
    print(df.head(30).to_string())


if __name__ == "__main__":
    main()