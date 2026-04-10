import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.api.analytics import get_trends, get_category_per_ton
from app.models.schema import DimKPI

def main():
    db = SessionLocal()
    try:
        # Find Corn Starch ID
        kpi = db.query(DimKPI).filter(DimKPI.name == "Corn Starch").first()
        if not kpi:
            print("KPI not found")
            return
            
        print(f"KPI: {kpi.name} (ID: {kpi.id})")
        
        # Test get_category_per_ton
        per_ton_res = get_category_per_ton(section_id=1, db=db)
        cs_res = next((r for r in per_ton_res if r['kpi_id'] == kpi.id), None)
        print("get_category_per_ton:")
        print(cs_res)
        
        # Test trends normal
        trends_normal = get_trends(kpi_id=kpi.id, section_id=1, view_mode='total', db=db)
        print("Trends total (first 3):")
        print(trends_normal[:3] if trends_normal else [])
        
        # Test trends per ton
        trends_per_ton = get_trends(kpi_id=kpi.id, section_id=1, view_mode='per_ton', db=db)
        print("Trends per_ton (first 3):")
        print(trends_per_ton[:3] if trends_per_ton else [])
        
    finally:
        db.close()

if __name__ == '__main__':
    main()
