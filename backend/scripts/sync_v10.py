import sys
sys.path.insert(0, '.')
from app.core.database import SessionLocal
from app.services.etl_pipeline import process_excel_files

db = SessionLocal()
result = process_excel_files(db)
print(f"Status: {result.status}")
print(f"Records: {result.records_processed}")
print(f"Message: {result.message}")
db.close()
