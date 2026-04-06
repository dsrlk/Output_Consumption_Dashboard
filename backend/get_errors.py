from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

DB_PATH = r"d:\CONSUMPTION REPORT\backend\data\processed\warehouse_v2.db"
engine = create_engine(f"sqlite:///{DB_PATH}")
Session = sessionmaker(bind=engine)
session = Session()

from app.models.schema import RefreshLog

log = session.query(RefreshLog).order_by(RefreshLog.timestamp.desc()).first()
print("Status:", log.status)
print("Records:", log.records_processed)
print("Message:", log.message)
