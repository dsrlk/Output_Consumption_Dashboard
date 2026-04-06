from app.core.database import SessionLocal
from app.models.schema import DimKPI

db = SessionLocal()

# Fix Weight Efficiency — should be Output not Derived/Other
kpi = db.query(DimKPI).filter(DimKPI.name == "Weight Efficiency").first()
if kpi:
    kpi.category = "Output"
    db.commit()
    print(f"Fixed: {kpi.name} -> {kpi.category}")
else:
    print("Weight Efficiency not found")

# Verify all Output KPIs now
outputs = db.query(DimKPI).filter(DimKPI.category == "Output").all()
print("\nAll Output KPIs:")
for k in outputs:
    print(f"  {k.name} ({k.unit})")
    
db.close()
