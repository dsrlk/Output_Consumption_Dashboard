import sqlite3
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import sys

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models.schema import DimKPI, FactKPIValue

DB_PATH = os.path.join("data", "processed", "warehouse_v6.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

query = db.query(DimKPI).join(FactKPIValue).filter(FactKPIValue.section_id == 1).distinct()
print(query.statement.compile(engine))
