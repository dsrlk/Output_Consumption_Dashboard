import pandas as pd
import json

excel_path = r'd:\CONSUMPTION REPORT\Input\Daily Consumption Report 2026.xlsx'
try:
    xls = pd.ExcelFile(excel_path)
    # Read first sheet without headers
    df = pd.read_excel(excel_path, sheet_name=xls.sheet_names[0], header=None, nrows=10)
    
    data = df.to_dict(orient='records')
    for i, row in enumerate(data):
        # Only print non-null values for readability
        clean_row = {col: val for col, val in row.items() if pd.notna(val)}
        print(f"Row {i}: {clean_row}")
except Exception as e:
    print("Error:", e)
