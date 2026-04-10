import pandas as pd
import os

filepath = os.path.join("data", "input", "Daily Consumption Report 2026.xlsx")
if os.path.exists(filepath):
    xls = pd.ExcelFile(filepath)
    df = pd.read_excel(filepath, sheet_name=xls.sheet_names[0], header=None)
    for i in range(8):
        print(f"Row {i}:", df.iloc[i].dropna().to_dict())
else:
    print("File not found.")
