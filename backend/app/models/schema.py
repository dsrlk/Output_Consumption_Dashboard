from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base

class DimSection(Base):
    __tablename__ = "dim_section"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    
class DimKPI(Base):
    __tablename__ = "dim_kpi"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    unit = Column(String, nullable=True) # kg, liters, %, etc.
    capacity = Column(Float, nullable=True) # Capacity entitlement limit extracted from row 7
    category = Column(String, nullable=True) # Output, Consumption, Orders

class DimDate(Base):
    __tablename__ = "dim_date"
    
    id = Column(Integer, primary_key=True, index=True) # YYYYMMDD
    date_val = Column(Date, unique=True, index=True, nullable=False)
    year = Column(Integer, index=True)
    month = Column(Integer, index=True)
    day = Column(Integer)
    day_of_week = Column(Integer)
    is_holiday = Column(Integer, default=0) # Treat as boolean 0/1

class DimSourceFile(Base):
    __tablename__ = "dim_source_file"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True, nullable=False)
    sheet_name = Column(String, nullable=False)
    processed_at = Column(DateTime, default=datetime.utcnow)
    
class FactKPIValue(Base):
    __tablename__ = "fact_kpi_value"
    
    id = Column(Integer, primary_key=True, index=True)
    date_id = Column(Integer, ForeignKey("dim_date.id"), index=True)
    section_id = Column(Integer, ForeignKey("dim_section.id"), index=True)
    kpi_id = Column(Integer, ForeignKey("dim_kpi.id"), index=True)
    file_id = Column(Integer, ForeignKey("dim_source_file.id"))
    value = Column(Float, nullable=True)
    
    # Relationships for easier ORM traversal
    date = relationship("DimDate")
    section = relationship("DimSection")
    kpi = relationship("DimKPI")
    source_file = relationship("DimSourceFile")

class RefreshLog(Base):
    """Stores logs of processing actions."""
    __tablename__ = "refresh_log"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    status = Column(String) # Success, Error, Warning
    message = Column(String)
    records_processed = Column(Integer, default=0)

class FactWorkingDays(Base):
    """Stores actual machine working days per section per monthly sheet."""
    __tablename__ = "fact_working_days"
    
    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("dim_section.id"), index=True)
    file_id = Column(Integer, ForeignKey("dim_source_file.id"))
    year = Column(Integer, index=True)
    month = Column(Integer, index=True)
    working_days = Column(Integer, nullable=False)

class DimKPIStandard(Base):
    """User-defined benchmark/standard values per KPI per section."""
    __tablename__ = "dim_kpi_standard"
    
    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("dim_section.id"), index=True)
    kpi_id = Column(Integer, ForeignKey("dim_kpi.id"), index=True)
    standard_value = Column(Float, nullable=False)
    period_type = Column(String, nullable=False, default="day")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class DimKPIStandardHistory(Base):
    """Audit log — every time a standard is saved, a record is written here."""
    __tablename__ = "dim_kpi_standard_history"

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("dim_section.id"), index=True)
    kpi_id = Column(Integer, ForeignKey("dim_kpi.id"), index=True)
    standard_value = Column(Float, nullable=False)
    period_type = Column(String, nullable=False, default="day")
    saved_at = Column(DateTime, default=datetime.utcnow)
