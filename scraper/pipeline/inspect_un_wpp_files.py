from pathlib import Path
import pandas as pd

file_path = Path(r"C:\Users\belelvser\PycharmProjects\Demographic-Transition-Atlas-Fertility-Health-and-Socioeconomic-Forces\scraper\data\un_wpp\undesa_pd_2017_abortion_laws_policies_country_dataset.xlsx")

df = pd.read_excel(
    file_path,
    sheet_name="Table 2",
    header=[6, 7]
)

def flatten_col(col):
    parts = [str(x).strip().replace("\n", " ") for x in col if pd.notna(x)]
    parts = [p for p in parts if not p.startswith("Unnamed")]
    return " | ".join(parts)

df.columns = [flatten_col(col) for col in df.columns]

print("FLATTENED COLUMNS:")
for c in df.columns:
    print(c)

print("\nHEAD BEFORE CLEAN:")
print(df.head(8).to_string())

# убрать строку, которая на самом деле дублирует названия колонок
df = df[df["Region or country"] != "Region or country"].copy()

print("\nHEAD AFTER DROPPING HEADER-LIKE ROW:")
print(df.head(8).to_string())