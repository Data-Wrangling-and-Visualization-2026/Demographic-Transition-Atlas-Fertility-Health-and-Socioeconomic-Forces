import pandas as pd
from your_existing_module import get_locations  # импортируем функцию из твоего скрипта

def export_un_to_csv():
    locations = get_locations()
    un_to_iso3_df = pd.DataFrame({
        "un_location_id": locations["id"],
        "un_name": locations["name"],
        "iso3": ""
    })
    un_to_iso3_df.to_csv("../config/un_to_iso3.csv", index=False)
    print("CSV файл создан: ../config/un_to_iso3.csv")

if __name__ == "__main__":
    export_un_to_csv()
