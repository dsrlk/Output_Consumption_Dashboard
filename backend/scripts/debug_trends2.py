import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.schema import DimKPI, FactKPIValue, DimDate
from sqlalchemy import func

db = SessionLocal()

# Check weight KPIs
weight_kpis = db.query(DimKPI.id, DimKPI.name).filter(
    DimKPI.name.in_(["Weight", "Total Weight"]), 
    DimKPI.category == "Output"
).all()
print("Weight KPIs:", weight_kpis)

if weight_kpis:
    weight_kpi_ids = [k[0] for k in weight_kpis]
    wt_q = db.query(
        DimDate.date_val,
        func.sum(FactKPIValue.value)
    ).join(FactKPIValue, DimDate.id == FactKPIValue.date_id) \
     .filter(FactKPIValue.kpi_id.in_(weight_kpi_ids), FactKPIValue.value > 0, FactKPIValue.section_id == 1)
     
    wt_results = wt_q.group_by(DimDate.date_val).having(func.sum(FactKPIValue.value) > 0).all()
    print("Weight records count:", len(wt_results))
    print("First 3:", wt_results[:3])

# Check Corn Starch
print("-"*40)
cs = db.query(DimKPI).filter(DimKPI.name == "Corn Starch").first()
print("Corn Starch ID:", cs.id)
cs_q = db.query(
    DimDate.date_val,
    func.sum(FactKPIValue.value).label('total')
).join(FactKPIValue, DimDate.id == FactKPIValue.date_id).filter(
    FactKPIValue.kpi_id == cs.id,
    FactKPIValue.value.isnot(None),
    FactKPIValue.value > 0,
    FactKPIValue.section_id == 1
)
cs_results = cs_q.group_by(DimDate.date_val).having(func.sum(FactKPIValue.value) > 0).all()
print("Corn Starch records count:", len(cs_results))
print("First 3:", cs_results[:3])

print("-"*40)
# Mock view_mode block
results = [(r.date_val, float(r.total)) for r in cs_results]
daily_tons = {r[0]: float(r[1]) / 1000.0 for r in wt_results}
normalized_results = []
for date_val, tot in results:
    tons = daily_tons.get(date_val, 0)
    if tons > 0:
        normalized_results.append((date_val, tot / tons))

print("Normalized length:", len(normalized_results))
if normalized_results:
    print("First 3 normalized:", normalized_results[:3])

