import pandas as pd
from pathlib import Path
from pipeline.sources.un import get_locations

def main():
    # 1) Берём все локации напрямую из UN API
    loc_df = get_locations()

    # Пытаемся угадать колонки (обычно id/name)
    if "id" in loc_df.columns:
        loc_id_col = "id"
    elif "locationId" in loc_df.columns:
        loc_id_col = "locationId"
    else:
        raise RuntimeError(f"Cannot find location id column in UN locations. Columns={list(loc_df.columns)}")

    if "name" in loc_df.columns:
        loc_name_col = "name"
    elif "location" in loc_df.columns:
        loc_name_col = "location"
    else:
        raise RuntimeError(f"Cannot find location name column in UN locations. Columns={list(loc_df.columns)}")

    total_locations = len(loc_df)

    # 2) Читаем маппинг UN -> ISO3
    map_df = pd.read_csv("pipeline/config/un_to_iso3.csv")
    if "un_location_id" not in map_df.columns or "iso3" not in map_df.columns:
        raise RuntimeError("un_to_iso3.csv must contain columns: un_location_id, iso3")

    mapping_rows = len(map_df)
    mapped_iso3 = map_df["iso3"].notna().sum()
    coverage_pct = round((mapped_iso3 / mapping_rows) * 100, 2) if mapping_rows else 0

    # 3) Unmatched: либо нет строки в mapping, либо iso3 пустой
    merged = loc_df[[loc_id_col, loc_name_col]].merge(
        map_df[["un_location_id", "iso3"]],
        left_on=loc_id_col,
        right_on="un_location_id",
        how="left"
    )

    unmatched = merged[merged["iso3"].isna()][[loc_id_col, loc_name_col]].copy()
    top20 = unmatched.head(20)

    # 4) Генерим markdown
    report = []
    report.append("# UN reconciliation report\n\n")
    report.append("Цель: показать, что мы согласуем UN локации со странами (ISO3) для объединения с World Bank.\n\n")

    report.append("## Summary\n\n")
    report.append(f"- Total UN locations (from UN API): **{total_locations}**\n")
    report.append(f"- Rows in mapping file `pipeline/config/un_to_iso3.csv`: **{mapping_rows}**\n")
    report.append(f"- Mapped to ISO3 (non-null iso3): **{mapped_iso3}** (**{coverage_pct}%**)\n\n")

    report.append("## Top-20 unmatched locations (no ISO3 mapping)\n\n")
    report.append("| un_location_id | un_name |\n")
    report.append("|---:|---|\n")
    for _, row in top20.iterrows():
        report.append(f"| {row[loc_id_col]} | {str(row[loc_name_col])} |\n")

    out_path = Path("docs/un_reconciliation.md")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("".join(report), encoding="utf-8")

    print(f"saved report to {out_path}")

if __name__ == "__main__":
    main()