import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.api.analytics import get_trends
from datetime import date

db = SessionLocal()
start_date = date(2026, 3, 1)
end_date = date(2026, 3, 31)

# Corn Starch is kpi_id=13 usually, let's verify
res = get_trends(kpi_id=13, section_id=1, view_mode='per_ton', db=db, start_date=start_date, end_date=end_date)
print("Trends normalized length:", len(res))
if res:
    print(res[:3])
else:
    # try kpi 2 (Furnace Oil)
    res2 = get_trends(kpi_id=2, section_id=1, view_mode='per_ton', db=db, start_date=start_date, end_date=end_date)
    print("Furnace Oil normalized len:", len(res2))
    if res2:
        print(res2[:3])
