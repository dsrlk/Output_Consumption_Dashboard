import sqlite3
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models.schema import DimKPI, FactKPIValue

DB_PATH = os.path.join("data", "processed", "warehouse_v6.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

results = db.query(DimKPI).join(FactKPIValue).filter(FactKPIValue.section_id == 1).distinct().all()
print("SQLAlchemy ORM Result Count:", len(results))
print("Results:", [r.name for r in results])

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()
cur.execute("SELECT DISTINCT dim_kpi.name FROM dim_kpi JOIN fact_kpi_value ON dim_kpi.id = fact_kpi_value.kpi_id WHERE fact_kpi_value.section_id = 1")
sql_results = cur.fetchall()
print("Raw SQL Result Count:", len(sql_results))
