import pandas as pd
import os

filepath = os.path.join("D:\\CONSUMPTION REPORT\\backend", "data", "input", "Daily Consumption Report 2026.xlsx")

if os.path.exists(filepath):
    xls = pd.ExcelFile(filepath)
    print("Sheets:", xls.sheet_names)
    
    # Just inspect the first actual data sheet, e.g. "January" or whatever
    df = pd.read_excel(filepath, sheet_name=xls.sheet_names[0], header=None, nrows=10)
    print("Row 2 (Excel Row 3):")
    for i, val in enumerate(df.iloc[2].values):
        kpi_name = df.iloc[4, i] if pd.notna(df.iloc[4, i]) else 'Unknown'
        print(f"Col {i}: {val} -> {kpi_name}")
else:
    print("File not found.")
