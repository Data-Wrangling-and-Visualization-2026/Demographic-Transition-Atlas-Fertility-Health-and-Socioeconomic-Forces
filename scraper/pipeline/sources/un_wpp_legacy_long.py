from pathlib import Path
import re
import pandas as pd


FEATURES = [
    "view_on_fertility_level",
    "policy_on_fertility_level",
    "concern_about_adolescent_fertility",
    "policies_reduce_adolescent_fertility",
    "family_planning_support",
    "abortion_grounds",
    "domestic_violence_policies",
]


COLUMN_MAP = {
    "country name": "country_name",
    "country code": "country_code_un",
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


def extract_year(path: Path) -> int:
    m = re.search(r"(19|20)\d{2}", path.name)
    if not m:
        raise ValueError(f"Could not extract year from filename: {path.name}")
    return int(m.group())


def normalize_col(name: str) -> str:
    s = str(name).strip().lower()
    s = s.replace("\n", " ")
    s = s.replace("/", " ")
    s = re.sub(r"\s+", " ", s)
    return COLUMN_MAP.get(s, re.sub(r"[^a-z0-9]+", "_", s).strip("_"))


def normalize_value(feature_code: str, value) -> str | None:
    if pd.isna(value):
        return None

    s = str(value).strip()
    if not s:
        return None

    lowered = s.lower()
    if lowered in {"nan", "none", "no data available", "not available", "n/a"}:
        return None

    if feature_code == "view_on_fertility_level":
        mapping = {
            "too high": "too_high",
            "too low": "too_low",
            "satisfactory": "satisfactory",
        }
        return mapping.get(lowered, lowered.replace(" ", "_"))

    if feature_code == "policy_on_fertility_level":
        mapping = {
            "raise": "raise",
            "lower": "lower",
            "maintain": "maintain",
            "no intervention": "no_intervention",
        }
        return mapping.get(lowered, lowered.replace(" ", "_"))

    if feature_code == "concern_about_adolescent_fertility":
        mapping = {
            "major concern": "major_concern",
            "minor concern": "minor_concern",
            "not a concern": "not_a_concern",
        }
        return mapping.get(lowered, lowered.replace(" ", "_"))

    if feature_code == "policies_reduce_adolescent_fertility":
        mapping = {
            "yes": "yes",
            "no": "no",
        }
        return mapping.get(lowered, lowered)

    if feature_code == "family_planning_support":
        mapping = {
            "no support": "no_support",
            "indirect support": "indirect_support",
            "direct support": "direct_support",
        }
        return mapping.get(lowered, lowered.replace(" ", "_"))

    if feature_code in {"abortion_grounds", "domestic_violence_policies"}:
        if lowered == "not permitted":
            return "not_permitted"
        parts = [p.strip() for p in s.split(",") if p.strip()]
        return "|".join(parts) if parts else None

    return lowered.replace(" ", "_")


def clean_df(df: pd.DataFrame) -> pd.DataFrame:
    df = df.dropna(how="all").copy()
    df.columns = [normalize_col(c) for c in df.columns]
    df = df[[c for c in df.columns if not c.startswith("unnamed")]].copy()

    if "country_name" in df.columns:
        df["country_name"] = df["country_name"].astype(str).str.strip()
        df = df[df["country_name"].notna()].copy()
        df = df[df["country_name"] != ""].copy()

        bad_prefixes = (
            "Source:",
            "To check definitions",
            "Definitions of Policy Variables",
            "For definition of",
            "For definitions of",
        )
        df = df[~df["country_name"].str.startswith(bad_prefixes, na=False)].copy()

    return df


def load_legacy_file_to_long(filepath: str) -> pd.DataFrame:
    path = Path(filepath)
    year = extract_year(path)

    df = pd.read_excel(
        path,
        sheet_name="rptWebDataQuery",
        header=1,
    )
    df = clean_df(df)

    rows = []

    for _, row in df.iterrows():
        country_name = row.get("country_name")
        if pd.isna(country_name) or not str(country_name).strip():
            continue

        for feature_code in FEATURES:
            if feature_code not in df.columns:
                continue

            feature_value = normalize_value(feature_code, row.get(feature_code))

            rows.append(
                {
                    "year": year,
                    "country_name": str(country_name).strip(),
                    "country_iso3": None,
                    "feature_code": feature_code,
                    "feature_value": feature_value,
                }
            )

    return pd.DataFrame(rows)