import pandas as pd

filepath = r"d:\CONSUMPTION REPORT\backend\data\input\Daily Consumption Report 2026.xlsx"
xls = pd.ExcelFile(filepath)
for sheet_name in xls.sheet_names:
    df = pd.read_excel(filepath, sheet_name=sheet_name, header=None)
    print(f"Sheet {sheet_name} has {len(df.columns)} columns.")
