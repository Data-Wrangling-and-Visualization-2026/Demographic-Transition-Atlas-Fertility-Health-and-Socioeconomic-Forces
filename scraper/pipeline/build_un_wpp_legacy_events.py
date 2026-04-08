from pathlib import Path
import pandas as pd

PROCESSED_DIR = Path("scraper/data/processed")
INPUT_PATH = PROCESSED_DIR / "un_wpp_legacy_panel.csv"
OUTPUT_PATH = PROCESSED_DIR / "un_wpp_legacy_events.csv"


FEATURE_CONFIG = {
    "policy_on_fertility_level": {
        "event_category": "population_policy",
        "event_subtype": "official_orientation",
        "title": "Population policy orientation changed",
    },
    "view_on_fertility_level": {
        "event_category": "population_policy",
        "event_subtype": "government_view",
        "title": "Government view on fertility level changed",
    },
    "family_planning_support": {
        "event_category": "family_planning",
        "event_subtype": "government_support",
        "title": "Family planning support changed",
    },
    "abortion_grounds": {
        "event_category": "abortion",
        "event_subtype": "legal_grounds",
        "title": "Abortion policy changed",
    },
    "domestic_violence_policies": {
        "event_category": "gender_reproductive_rights",
        "event_subtype": "domestic_violence_policy",
        "title": "Domestic violence policy changed",
    },
    "concern_about_adolescent_fertility": {
        "event_category": "reproductive_health",
        "event_subtype": "adolescent_fertility_concern",
        "title": "Concern about adolescent fertility changed",
    },
    "policies_reduce_adolescent_fertility": {
        "event_category": "reproductive_health",
        "event_subtype": "adolescent_fertility_policy",
        "title": "Adolescent fertility policy changed",
    },
}


def normalize_value(v):
    if pd.isna(v):
        return None

    s = str(v).strip()
    if s == "" or s.lower() == "nan":
        return None

    bad_values = {
        "no data available",
        "data not available",
        "not available",
        "na",
        "n/a",
        "none",
    }

    if s.lower() in bad_values:
        return None

    return s


def infer_policy_direction(feature_name: str, old_value: str | None, new_value: str | None) -> str:
    if new_value is None:
        return "unknown"

    new_lower = new_value.lower()
    old_lower = (old_value or "").lower()

    if feature_name == "family_planning_support":
        rank = {
            "no support": 0,
            "indirect support": 1,
            "direct support": 2,
        }

        old_rank = rank.get((old_value or "").lower())
        new_rank = rank.get((new_value or "").lower())

        if old_rank is not None and new_rank is not None:
            if new_rank > old_rank:
                return "expansive"
            if new_rank < old_rank:
                return "restrictive"
            return "neutral"

    if feature_name == "policy_on_fertility_level":
        if "raise" in new_lower:
            return "pro_natal"
        if "lower" in new_lower:
            return "anti_natal"
        if "maintain" in new_lower or "no intervention" in new_lower:
            return "neutral"

    if feature_name == "abortion_grounds":
        try:
            old_n = len((old_value or "").split(",")) if old_value else 0
            new_n = len(new_value.split(",")) if new_value else 0
            if new_n > old_n:
                return "expansive"
            if new_n < old_n:
                return "restrictive"
        except Exception:
            pass

    return "unknown"


def build_summary(feature_name: str, old_value: str | None, new_value: str | None) -> str:
    labels = {
        "policy_on_fertility_level": "Population policy orientation",
        "view_on_fertility_level": "Government view on fertility level",
        "family_planning_support": "Family planning support",
        "abortion_grounds": "Legal grounds for abortion",
        "domestic_violence_policies": "Domestic violence policy",
        "concern_about_adolescent_fertility": "Concern about adolescent fertility",
        "policies_reduce_adolescent_fertility": "Policies to reduce adolescent fertility",
    }
    label = labels.get(feature_name, feature_name)
    return f"{label} changed from '{old_value}' to '{new_value}'."

def build_mechanism(feature_name: str) -> str:
    mapping = {
        "policy_on_fertility_level": "This may affect how the state approaches fertility trends and demographic goals.",
        "view_on_fertility_level": "This may reflect a shift in how fertility trends are evaluated by the government.",
        "family_planning_support": "This may affect access to family planning services and reproductive choices.",
        "abortion_grounds": "This may affect legal access to abortion and reproductive autonomy.",
        "domestic_violence_policies": "This may reflect broader reproductive rights and protection policies.",
        "concern_about_adolescent_fertility": "This may influence reproductive health priorities for adolescents.",
        "policies_reduce_adolescent_fertility": "This may affect reproductive health interventions targeting adolescents.",
    }
    return mapping.get(feature_name, "This may affect reproductive policy context.")


def main():
    df = pd.read_csv(INPUT_PATH)
    df = df.sort_values(["country_name", "revision_year"]).copy()

    events = []

    for country_name, group in df.groupby("country_name"):
        group = group.sort_values("revision_year").reset_index(drop=True)

        for feature_name, meta in FEATURE_CONFIG.items():
            if feature_name not in group.columns:
                continue

            prev_value = None
            prev_year = None

            for _, row in group.iterrows():
                current_value = normalize_value(row.get(feature_name))
                current_year = int(row["revision_year"])

                if prev_year is None:
                    prev_value = current_value
                    prev_year = current_year
                    continue

                if (
                        prev_value is not None
                        and current_value is not None
                        and current_value != prev_value
                ):
                    events.append({
                        "country_name": row["country_name"],
                        "country_code": row["country_code"],
                        "region": row.get("region"),
                        "revision_year": current_year,
                        "source": "un_wpp",
                        "event_category": meta["event_category"],
                        "event_subtype": meta["event_subtype"],
                        "feature_name": feature_name,
                        "old_value": prev_value,
                        "new_value": current_value,
                        "title": meta["title"],
                        "summary": build_summary(feature_name, prev_value, current_value),
                        "mechanism": build_mechanism(feature_name),
                        "policy_direction": infer_policy_direction(feature_name, prev_value, current_value),
                    })

                prev_value = current_value
                prev_year = current_year

    events_df = pd.DataFrame(events)
    events_df.to_csv(OUTPUT_PATH, index=False)

    print(f"[saved] {OUTPUT_PATH} rows={len(events_df)}")
    print("\nCOLUMNS:")
    print(events_df.columns.tolist())
    print("\nHEAD:")
    print(events_df.head(20).to_string())


if __name__ == "__main__":
    main()