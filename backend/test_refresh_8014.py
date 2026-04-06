import uvicorn
import asyncio
from app.main import app
from app.core.database import SessionLocal, Base, engine
from app.services.etl_pipeline import process_excel_files

def run_refresh():
    # Force initialize the new schema rules!
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("Commencing warehouse_v7 pipeline categorization block...")
        process_excel_files(db)
        print("Database schema successfully generated and processed into dimensions.")
    except Exception as e:
        print(f"Error executing category tagging: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_refresh()
    # Bring the entire Fast API system online at port 8014
    uvicorn.run(app, host="127.0.0.1", port=8014)
