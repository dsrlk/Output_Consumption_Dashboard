from sqlalchemy import create_engine
import pandas as pd

DB_PATH = r"d:\CONSUMPTION REPORT\backend\data\processed\warehouse_v2.db"
engine = create_engine(f"sqlite:///{DB_PATH}")

df = pd.read_sql("SELECT name FROM dim_section", engine)
print("Sections:")
print(df)

df_facts = pd.read_sql("SELECT s.name as Section, k.name as KPI, count(f.id) as facts FROM fact_kpi_value f JOIN dim_section s ON f.section_id = s.id JOIN dim_kpi k ON f.kpi_id = k.id GROUP BY s.name, k.name", engine)
print("\nFacts Breakdown:")
print(df_facts.to_string())
