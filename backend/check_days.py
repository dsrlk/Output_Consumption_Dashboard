from sqlalchemy import create_engine
import pandas as pd
engine = create_engine('sqlite:///backend/data/processed/warehouse_v11.db')
query = """
SELECT d.date_val, k.name, f.value
FROM fact_kpi_value f
JOIN dim_date d ON d.id = f.date_id
JOIN dim_kpi k ON k.id = f.kpi_id
JOIN dim_section s ON s.id = f.section_id
WHERE s.name = 'Corrugator' AND d.month = 3 AND d.year = 2026 AND f.value > 0
"""
df = pd.read_sql(query, engine)
print('Total rows:', len(df))
dates_with_any = df['date_val'].unique()
print('Dates with any value > 0:', len(dates_with_any))
dates_with_weight = df[df['name'] == 'Weight']['date_val'].unique()
print('Dates with Weight > 0:', len(dates_with_weight))
diff = set(dates_with_any) - set(dates_with_weight)
print('Dates with NO weight but other values:', diff)
if diff:
    print('Values on those anomalous dates:')
    print(df[df['date_val'].isin(diff)][['date_val', 'name', 'value']])
