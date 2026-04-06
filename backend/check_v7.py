from app.core.database import SessionLocal
from app.models.schema import DimKPI

db = SessionLocal()
kpis = db.query(DimKPI).all()
for kpi in kpis:
    print(f"ID: {kpi.id}, Name: {kpi.name}, Category: {kpi.category}")
    
db.close()
