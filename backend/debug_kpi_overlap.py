import sqlite3
import os

db_path = os.path.join("data", "processed", "warehouse_v6.db")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Find Corrugator ID
cur.execute("SELECT id FROM dim_section WHERE name='Corrugator'")
c_id = cur.fetchone()[0]

# Check P1 & P6 Qty KPI ID
cur.execute("SELECT id FROM dim_kpi WHERE name='P1 & P6 Qty'")
k_id = cur.fetchone()[0]

# Check facts
cur.execute(f"SELECT COUNT(*) FROM fact_kpi_value WHERE kpi_id={k_id} AND section_id={c_id}")
print(f"P1 & P6 facts with Corrugator section: {cur.fetchone()[0]}")
