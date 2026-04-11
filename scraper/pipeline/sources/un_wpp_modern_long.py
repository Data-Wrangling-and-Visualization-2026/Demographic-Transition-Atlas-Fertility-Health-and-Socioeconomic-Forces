from pathlib import Path
import pandas as pd


def clean_str(x) -> str:
    if pd.isna(x):
        return ""
    return str(x).strip()


def flatten_col(col) -> str:
    if isinstance(col, tuple):
        return " | ".join([clean_str(x) for x in col if clean_str(x)])
    return clean_str(col)


def normalize_simple_value(feature_code: str, value) -> str | None:
    if pd.isna(value):
        return None

    s = str(value).strip()
    if not s:
        return None

    lowered = s.lower()
    if lowered in {"nan", "none", "no data available", "not available", "n/a", "—", "―", "-"}:
        return None

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

    if feature_code == "family_planning_support":
        mapping = {
            "direct support": "direct_support",
            "indirect support": "indirect_support",
            "no support": "no_support",
            "none of these": "no_support",
            "expand": "direct_support",
            "maintain": "indirect_support",
            "restrict": "no_support",
            "yes": "direct_support",
            "no": "no_support",
        }
        return mapping.get(lowered, lowered.replace(" ", "_"))

    return lowered.replace(" ", "_")


def normalize_yes_no_cell(value) -> str | None:
    if pd.isna(value):
        return None

    s = str(value).strip().lower()
    if s in {"yes", "1", "true"}:
        return "yes"
    if s in {"no", "0", "false", "—", "―", "-"}:
        return "no"
    return None


def aggregate_abortion_grounds(pairs: list[tuple[str, object]]) -> str | None:
    selected = []
    for code, value in pairs:
        norm = normalize_yes_no_cell(value)
        if norm == "yes":
            selected.append(code)

    if not selected:
        return None

    return "|".join(selected)


def keep_country_rows(df: pd.DataFrame, country_col: str, code_col: str | None = None) -> pd.DataFrame:
    out = df.copy()

    out[country_col] = out[country_col].astype(str).str.strip()
    out = out[out[country_col].notna()].copy()
    out = out[out[country_col] != ""].copy()

    if code_col and code_col in out.columns:
        out[code_col] = pd.to_numeric(out[code_col], errors="coerce")
        out = out[out[code_col].notna()].copy()

    banned_exact = {
        "AFRICA",
        "ASIA",
        "EUROPE",
        "OCEANIA",
        "NORTHERN AMERICA",
        "LATIN AMERICA AND THE CARIBBEAN",
        "WORLD",
        "EASTERN AFRICA",
        "MIDDLE AFRICA",
        "NORTHERN AFRICA",
        "SOUTHERN AFRICA",
        "WESTERN AFRICA",
        "EASTERN ASIA",
        "SOUTH-CENTRAL ASIA",
        "SOUTH-EASTERN ASIA",
        "WESTERN ASIA",
        "EASTERN EUROPE",
        "NORTHERN EUROPE",
        "SOUTHERN EUROPE",
        "WESTERN EUROPE",
        "CARIBBEAN",
        "CENTRAL AMERICA",
        "SOUTH AMERICA",
        "POLYNESIA",
        "MICRONESIA",
        "MELANESIA",
    }
    out = out[~out[country_col].str.upper().isin(banned_exact)].copy()

    out = out[~out[country_col].str.startswith("Source:", na=False)].copy()
    out = out[~out[country_col].str.startswith("To check definitions", na=False)].copy()
    out = out[~out[country_col].str.startswith("Definitions of Policy Variables", na=False)].copy()
    out = out[~out[country_col].str.startswith("For definition of", na=False)].copy()
    out = out[~out[country_col].str.startswith("For definitions of", na=False)].copy()

    out = out[~out[country_col].str.contains(":", na=False)].copy()
    out = out[~out[country_col].str.contains("measured by", case=False, na=False)].copy()
    out = out[~out[country_col].str.contains("adolescence is", case=False, na=False)].copy()
    out = out[~out[country_col].str.contains("publicly subsidized", case=False, na=False)].copy()
    out = out[~out[country_col].str.contains("maternity leave", case=False, na=False)].copy()
    out = out[~out[country_col].str.contains("paternity leave", case=False, na=False)].copy()
    out = out[~out[country_col].str.contains("baby bonus", case=False, na=False)].copy()

    return out


def find_col(columns, must_have=None, any_of=None):
    must_have = must_have or []
    any_of = any_of or []

    for c in columns:
        cl = c.lower()
        if all(x.lower() in cl for x in must_have):
            if not any_of or any(x.lower() in cl for x in any_of):
                return c

    raise ValueError(
        f"Could not find column. must_have={must_have}, any_of={any_of}\n"
        f"Available columns:\n" + "\n".join(map(str, columns))
    )


def parse_2015(filepath: str) -> pd.DataFrame:
    df = pd.read_excel(filepath, sheet_name="rptWebDataQuery_noIndics2", header=1)
    df.columns = [clean_str(c) for c in df.columns]

    rename_map = {
        "Country  name": "country_name",
        "Country code": "country_code",
        "Policy on fertility level": "policy_on_fertility_level",
        "Government support for family planning": "family_planning_support",
        "Legal grounds on which abortion is permitted": "abortion_grounds",
    }
    df = df.rename(columns=rename_map)
    df = keep_country_rows(df, "country_name", "country_code")

    rows = []
    for _, row in df.iterrows():
        country = clean_str(row["country_name"])

        value = normalize_simple_value("policy_on_fertility_level", row.get("policy_on_fertility_level"))
        if value is not None:
            rows.append({
                "year": 2015,
                "country_name": country,
                "country_iso3": None,
                "feature_code": "policy_on_fertility_level",
                "feature_value": value,
            })

        value = normalize_simple_value("family_planning_support", row.get("family_planning_support"))
        if value is not None:
            rows.append({
                "year": 2015,
                "country_name": country,
                "country_iso3": None,
                "feature_code": "family_planning_support",
                "feature_value": value,
            })

        raw = row.get("abortion_grounds")
        value = None if pd.isna(raw) else "|".join([p.strip() for p in str(raw).split(",") if p.strip()])
        if value is not None:
            rows.append({
                "year": 2015,
                "country_name": country,
                "country_iso3": None,
                "feature_code": "abortion_grounds",
                "feature_value": value,
            })

    return pd.DataFrame(rows)


def parse_2017_abortion(filepath: str) -> pd.DataFrame:
    df = pd.read_excel(filepath, sheet_name="Table 2", header=[7, 8])
    df.columns = [flatten_col(c) for c in df.columns]

    country_col = find_col(df.columns, must_have=["region or country"])
    code_col = find_col(df.columns, must_have=["region or country code"])

    df = df.rename(columns={country_col: "country_name", code_col: "country_code"})
    df = keep_country_rows(df, "country_name", "country_code")

    ground_cols = {
        "life": find_col(df.columns, must_have=["1.a"], any_of=["save a woman's life", "save a womans life"]),
        "health": find_col(df.columns, must_have=["1.b"], any_of=["preserve a woman's health", "preserve a womans health"]),
        "physical_health": find_col(df.columns, must_have=["1.c"], any_of=["physical", "health"]),
        "mental_health": find_col(df.columns, must_have=["1.d"], any_of=["mental", "health"]),
        "incest": find_col(df.columns, must_have=["1.f"], any_of=["incest"]),
        "rape": find_col(df.columns, must_have=["1.g"], any_of=["rape"]),
        "fetal_impairment": find_col(df.columns, must_have=["1.h"], any_of=["foetal impairment", "fetal impairment"]),
        "social_economic": find_col(df.columns, must_have=["1.i"], any_of=["economic", "social"]),
        "on_request": find_col(df.columns, must_have=["1.j"], any_of=["on request"]),
        "other": find_col(df.columns, must_have=["1.k"], any_of=["other legal grounds", "other"]),
    }

    rows = []
    for _, row in df.iterrows():
        country = clean_str(row["country_name"])
        value = aggregate_abortion_grounds([(k, row.get(v)) for k, v in ground_cols.items()])
        if value is not None:
            rows.append({
                "year": 2017,
                "country_name": country,
                "country_iso3": None,
                "feature_code": "abortion_grounds",
                "feature_value": value,
            })

    return pd.DataFrame(rows)


def parse_2019_fertility(filepath: str) -> pd.DataFrame:
    df = pd.read_excel(filepath, sheet_name="Table 2-Fert", header=[8, 9, 10])
    flat_cols = [flatten_col(c) for c in df.columns]
    df.columns = flat_cols

    country_col = flat_cols[1]
    code_col = flat_cols[2]
    type_col = flat_cols[3]

    df = df.rename(columns={
        country_col: "country_name",
        code_col: "country_code",
        type_col: "Type",
    })
    df = keep_country_rows(df, "country_name", "country_code")

    policy_col = next(c for c in df.columns if "2.1." in c and "present level of fertility" in c.lower())
    concern_col = next(c for c in df.columns if "2.4." in c and "matter of concern" in c.lower())

    rows = []
    for _, row in df.iterrows():
        country = clean_str(row["country_name"])

        policy_value = normalize_simple_value("policy_on_fertility_level", row.get(policy_col))
        if policy_value is not None:
            rows.append({
                "year": 2019,
                "country_name": country,
                "country_iso3": None,
                "feature_code": "policy_on_fertility_level",
                "feature_value": policy_value,
            })

        concern_value = normalize_simple_value("concern_about_adolescent_fertility", row.get(concern_col))
        if concern_value is not None:
            rows.append({
                "year": 2019,
                "country_name": country,
                "country_iso3": None,
                "feature_code": "concern_about_adolescent_fertility",
                "feature_value": concern_value,
            })

    return pd.DataFrame(rows)


def parse_2019_family_planning(filepath: str) -> pd.DataFrame:
    df = pd.read_excel(filepath, sheet_name="Table 4-FP", header=[8, 9, 10])
    flat_cols = [flatten_col(c) for c in df.columns]
    df.columns = flat_cols

    country_col = flat_cols[1]
    code_col = flat_cols[2]
    type_col = flat_cols[3]

    df = df.rename(columns={country_col: "country_name", code_col: "country_code", type_col: "Type"})
    df = keep_country_rows(df, "country_name", "country_code")

    policy_col = next(c for c in df.columns if "2.25." in c and "modern contraceptive methods" in c.lower())

    rows = []
    for _, row in df.iterrows():
        country = clean_str(row["country_name"])
        value = normalize_simple_value("family_planning_support", row.get(policy_col))
        if value is not None:
            rows.append({
                "year": 2019,
                "country_name": country,
                "country_iso3": None,
                "feature_code": "family_planning_support",
                "feature_value": value,
            })

    return pd.DataFrame(rows)


def parse_2019_abortion(filepath: str) -> pd.DataFrame:
    df = pd.read_excel(filepath, sheet_name="Table 6-Abrn", header=[8, 9, 10])
    flat_cols = [flatten_col(c) for c in df.columns]
    df.columns = flat_cols

    country_col = flat_cols[1]
    code_col = flat_cols[2]
    type_col = flat_cols[3]

    df = df.rename(columns={country_col: "country_name", code_col: "country_code", type_col: "Type"})
    df = keep_country_rows(df, "country_name", "country_code")

    ground_cols = {
        "life": next(c for c in df.columns if "2.34.a." in c and "save a woman's life" in c.lower()),
        "physical_health": next(c for c in df.columns if "2.34.b." in c and "physical health" in c.lower()),
        "mental_health": next(c for c in df.columns if "2.34.c." in c and "mental health" in c.lower()),
        "rape": next(c for c in df.columns if "2.34.d." in c and "rape" in c.lower()),
        "incest": next(c for c in df.columns if "2.34.e." in c and "incest" in c.lower()),
        "fetal_impairment": next(c for c in df.columns if "2.34.f." in c and "fetal impairment" in c.lower()),
        "social_economic": next(c for c in df.columns if "2.34.h." in c and "economic or social reasons" in c.lower()),
        "on_request": next(c for c in df.columns if "2.34.i." in c and "on request" in c.lower()),
    }

    rows = []
    for _, row in df.iterrows():
        country = clean_str(row["country_name"])
        value = aggregate_abortion_grounds([(k, row.get(v)) for k, v in ground_cols.items()])
        if value is not None:
            rows.append({
                "year": 2019,
                "country_name": country,
                "country_iso3": None,
                "feature_code": "abortion_grounds",
                "feature_value": value,
            })

    return pd.DataFrame(rows)


def parse_2021_abortion(filepath: str) -> pd.DataFrame:
    df = pd.read_excel(filepath, sheet_name="Table 1d-ABR", header=[6, 7, 8])
    df.columns = [flatten_col(c) for c in df.columns]

    country_col = df.columns[0]
    code_col = df.columns[1]
    type_col = df.columns[2]

    df = df.rename(columns={
        country_col: "country_name",
        code_col: "country_code",
        type_col: "Type",
    })
    df = keep_country_rows(df, "country_name", "country_code")

    ground_cols = {
        "life": find_col(df.columns, any_of=["save a woman's life", "save a womans life"]),
        "health": find_col(df.columns, any_of=["preserve a woman's health", "preserve a womans health"]),
        "rape": find_col(df.columns, any_of=["rape"]),
        "fetal_impairment": find_col(df.columns, any_of=["fetal impairment", "foetal impairment"]),
    }

    rows = []
    for _, row in df.iterrows():
        country = clean_str(row["country_name"])
        value = aggregate_abortion_grounds([(k, row.get(v)) for k, v in ground_cols.items()])
        if value is not None:
            rows.append({
                "year": 2021,
                "country_name": country,
                "country_iso3": None,
                "feature_code": "abortion_grounds",
                "feature_value": value,
            })

    return pd.DataFrame(rows)


def load_modern_files_to_long(file_map: dict[str, str]) -> pd.DataFrame:
    frames = []

    if "2015" in file_map:
        frames.append(parse_2015(file_map["2015"]))

    if "2017" in file_map:
        frames.append(parse_2017_abortion(file_map["2017"]))

    if "2019" in file_map:
        frames.append(parse_2019_fertility(file_map["2019"]))
        frames.append(parse_2019_family_planning(file_map["2019"]))
        frames.append(parse_2019_abortion(file_map["2019"]))

    if "2021" in file_map:
        frames.append(parse_2021_abortion(file_map["2021"]))

    if not frames:
        return pd.DataFrame(columns=["year", "country_name", "country_iso3", "feature_code", "feature_value"])

    result = pd.concat(frames, ignore_index=True)
    result = result[result["feature_value"].notna()].copy()
    result = result[result["feature_value"] != ""].copy()
    return result