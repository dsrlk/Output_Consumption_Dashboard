from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

class SectionBase(BaseModel):
    name: str

class SectionResponse(SectionBase):
    id: int
    class Config:
        orm_mode = True

class KPIBase(BaseModel):
    name: str
    unit: Optional[str] = None
    category: Optional[str] = None

class KPIResponse(KPIBase):
    id: int
    class Config:
        orm_mode = True

class DataValueResponse(BaseModel):
    id: int
    date: date
    section: str
    kpi: str
    unit: Optional[str] = None
    value: Optional[float] = None
    file: str
    
    class Config:
        orm_mode = True

class RefreshResponse(BaseModel):
    status: str
    message: str
    records_processed: int
