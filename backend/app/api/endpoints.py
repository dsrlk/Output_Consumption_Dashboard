from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, timedelta
import os
import shutil

from app.core.database import get_db
from app.core.auth import verify_admin
from app.models.schema import DimSection, DimKPI, FactKPIValue, RefreshLog, DimDate, DimSourceFile
from app.schemas.schemas import SectionResponse, KPIResponse, DataValueResponse, RefreshResponse
from app.services.etl_pipeline import process_excel_files, INPUT_DIR
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Auth verify (used by frontend login) ──────────────────────────────────────
@router.post("/auth/verify")
def verify_password(_=Depends(verify_admin)):
    """Frontend calls this to check if the admin password is correct."""
    return {"ok": True}

# ── Protected: upload Excel + trigger ETL ────────────────────────────────────
@router.post("/upload", response_model=RefreshResponse)
async def upload_and_refresh(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(verify_admin)
):
    """Upload an Excel file to the input directory and immediately run the ETL pipeline."""
    if not file.filename.endswith(('.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="Only .xls and .xlsx files are accepted.")

    os.makedirs(INPUT_DIR, exist_ok=True)
    dest = os.path.join(INPUT_DIR, file.filename)

    # Save uploaded file to disk
    with open(dest, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    logger.info(f"Uploaded file saved: {dest}")

    try:
        log_record = process_excel_files(db)
        return RefreshResponse(
            status=log_record.status,
            message=log_record.message,
            records_processed=log_record.records_processed
        )
    except Exception as e:
        logger.error(f"ETL failed after upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ── Protected: manual rescan (no file upload) ─────────────────────────────────
@router.post("/refresh", response_model=RefreshResponse)
def trigger_refresh(db: Session = Depends(get_db), _=Depends(verify_admin)):
    """Triggers the ETL pipeline to rescan the input folder and update the database."""
    try:
        log_record = process_excel_files(db)
        return RefreshResponse(
            status=log_record.status,
            message=log_record.message,
            records_processed=log_record.records_processed
        )
    except Exception as e:
        logger.error(f"Refresh failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ── Public: status & filters ──────────────────────────────────────────────────
@router.get("/status")
def get_status(db: Session = Depends(get_db)):
    """Returns the latest refresh log."""
    log = db.query(RefreshLog).order_by(RefreshLog.timestamp.desc()).first()
    if log:
        local_time = log.timestamp + timedelta(hours=5, minutes=30) if log.timestamp else None
        return {"last_refresh": local_time, "status": log.status, "records_processed": log.records_processed}
    return {"last_refresh": None, "status": "No Refreshes Yet", "records_processed": 0}

@router.get("/filters/sections", response_model=List[SectionResponse])
def get_sections(db: Session = Depends(get_db)):
    return db.query(DimSection).all()

@router.get("/filters/kpis", response_model=List[KPIResponse])
def get_kpis(section_id: Optional[int] = None, db: Session = Depends(get_db)):
    if section_id:
        return db.query(DimKPI).join(FactKPIValue).filter(FactKPIValue.section_id == section_id).distinct().all()
    return db.query(DimKPI).all()

@router.get("/filters/dates")
def get_date_range(db: Session = Depends(get_db)):
    min_date = db.query(func.min(DimDate.date_val)).scalar()
    max_date = db.query(func.max(DimDate.date_val)).scalar()
    return {"min_date": min_date, "max_date": max_date}

@router.get("/records")
def get_records(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    section_id: Optional[int] = None,
    kpi_id: Optional[int] = None
):
    query = db.query(FactKPIValue).join(DimDate).join(DimSection).join(DimKPI).join(DimSourceFile)

    if section_id:
        query = query.filter(FactKPIValue.section_id == section_id)
    if kpi_id:
        query = query.filter(FactKPIValue.kpi_id == kpi_id)

    total = query.count()
    records = query.order_by(DimDate.date_val.desc()).offset(skip).limit(limit).all()

    results = []
    for r in records:
        results.append({
            "id": r.id,
            "date": r.date.date_val,
            "section": r.section.name,
            "kpi": r.kpi.name,
            "unit": r.kpi.unit,
            "value": r.value,
            "file": r.source_file.filename
        })

    return {"total": total, "data": results}
