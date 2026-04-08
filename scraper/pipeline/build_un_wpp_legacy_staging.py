from pathlib import Path
import re
import pandas as pd

from sources.un_wpp_legacy import read_legacy_un_wpp

DATA_DIR = Path("scraper/data/un_wpp")
OUT_DIR = Path("scraper/data/processed")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def detect_family(filename: str) -> str | None:
    name = filename.lower()

    # legacy simple fertility files
    if re.match(r"desa_pd_(1976|1986|1996|2001|2003|2005|2007|2009|2011|2013)_wppdataset_fertility\.xls$", name):
        return "fertility"

    # legacy simple reproductive health / family planning files
    if re.match(r"desa_pd_(1976|1986|1996|2001|2003|2005|2007|2009|2011|2013)_wppdataset_reproductivehealthfamilyplanning\.xls$", name):
        return "reproductive_health_family_planning"

    return None


def main():
    files = sorted(DATA_DIR.glob("*.xls"))

    fertility_frames = []
    rhfp_frames = []

    for path in files:
        family = detect_family(path.name)
        if family is None:
            print(f"Skipping {path.name}")
            continue

        print(f"Reading {path.name} -> {family}")
        df = read_legacy_un_wpp(str(path))

        if family == "fertility":
            fertility_frames.append(df)
        elif family == "reproductive_health_family_planning":
            rhfp_frames.append(df)

    if fertility_frames:
        fertility_df = pd.concat(fertility_frames, ignore_index=True)
        fertility_df.to_csv(OUT_DIR / "un_wpp_legacy_fertility.csv", index=False)
        print(f"[saved] {OUT_DIR / 'un_wpp_legacy_fertility.csv'} rows={len(fertility_df)}")

    if rhfp_frames:
        rhfp_df = pd.concat(rhfp_frames, ignore_index=True)
        rhfp_df.to_csv(OUT_DIR / "un_wpp_legacy_rhfp.csv", index=False)
        print(f"[saved] {OUT_DIR / 'un_wpp_legacy_rhfp.csv'} rows={len(rhfp_df)}")


if __name__ == "__main__":
    main()