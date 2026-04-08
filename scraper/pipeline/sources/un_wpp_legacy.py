from pathlib import Path
import re
import pandas as pd


def extract_revision_year_from_filename(path: Path) -> int | None:
    m = re.search(r"(19|20)\d{2}", path.name)
    return int(m.group()) if m else None


def normalize_column_name(name: str) -> str:
    name = str(name).strip().lower()
    name = name.replace("\n", " ")
    name = name.replace("/", " ")
    name = re.sub(r"\s+", " ", name)

    replacements = {
        "country name": "country_name",
        "country code": "country_code",
        "region": "region",
        "development level": "development_level",
        "least developed country": "least_developed_country",
        "view on fertility level": "view_on_fertility_level",
        "policy on fertility level": "policy_on_fertility_level",
        "level of concern about adolescent fertility": "concern_about_adolescent_fertility",
        "policies to reduce adolescent fertility": "policies_reduce_adolescent_fertility",
        "government support for family planning": "family_planning_support",
        "grounds on which abortion is permitted": "abortion_grounds",
        "policies to prevent domestic violence": "domestic_violence_policies",
    }

    if name in replacements:
        return replacements[name]

    name = re.sub(r"[^a-z0-9]+", "_", name).strip("_")
    return name


def read_legacy_un_wpp(filepath: str) -> pd.DataFrame:
    path = Path(filepath)
    revision_year = extract_revision_year_from_filename(path)

    df = pd.read_excel(
        path,
        sheet_name="rptWebDataQuery",
        header=1
    )

    df = df.dropna(how="all").copy()
    df.columns = [normalize_column_name(c) for c in df.columns]

    # убрать мусорные unnamed колонки
    df = df[[c for c in df.columns if not c.startswith("unnamed")]].copy()

    if "country_name" in df.columns:
        df["country_name"] = df["country_name"].astype(str).str.strip()

        # убрать пустые
        df = df[df["country_name"].notna()].copy()
        df = df[df["country_name"] != ""].copy()

        # убрать footer / source notes
        bad_prefixes = (
            "Source:",
            "To check definitions",
            "Definitions of Policy Variables",
            "For definition of",
            "For definitions of",
        )
        df = df[~df["country_name"].str.startswith(bad_prefixes, na=False)].copy()

    if "country_code" in df.columns:
        df["country_code"] = pd.to_numeric(df["country_code"], errors="coerce")

        # оставить только строки, где country_code реально число
        df = df[df["country_code"].notna()].copy()
        df["country_code"] = df["country_code"].astype("Int64")

    df["revision_year"] = revision_year
    df["source_file"] = path.name

    return df