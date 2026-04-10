import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.schema import FactKPIValue, DimKPI

db = SessionLocal()
w_kpi = db.query(DimKPI).filter(DimKPI.name == "Weight").first()
if w_kpi:
    print("Weight KPI ID:", w_kpi.id)
    recs = db.query(FactKPIValue.section_id).filter(FactKPIValue.kpi_id == w_kpi.id).limit(5).all()
    print("Sample section_ids for Weight:", recs)
else:
    print("Weight not found")
