import os
import pandas as pd
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.schema import DimSection, DimKPI, DimDate, DimSourceFile, FactKPIValue, RefreshLog, FactWorkingDays
import logging

logger = logging.getLogger(__name__)

INPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "input")

# Hardcoded index mappings provided by the user layout
KPI_MAP = [
  ("Sales", "Orders Brought In", 1, "KG"),
  ("Corrugator", "Weight", 2, "KG"),
  ("Corrugator", "Linear Meters", 3, "LMTS"),
  ("Corrugator", "Square Meters", 4, "SQM"),
  ("Corrugator", "Weight Efficiency", 5, "%"),
  ("Corrugator", "Capacity Utilisation", 6, "%"),
  ("Corrugator", "No of Workers", 7, "count"),
  ("Corrugator", "Weight/Worker", 8, "KG"),
  ("Corrugator", "Hours Worked", 9, "hours"),
  ("Corrugator", "Weight/Labour Hour", 10, "KG"),
  ("Corrugator", "Furnace Oil Consumed", 11, "Liters"),
  ("Corrugator", "Furnace Oil/Ton", 12, "Liters/Ton"),
  ("Corrugator", "Corn Starch", 13, "KG"),
  ("Corrugator", "Starch", 14, "KG"),
  ("Corrugator", "Starch / Ton", 15, "KG/Ton"),
  ("Corrugator", "Caustic Soda", 16, "KG"),
  ("Corrugator", "Caustic Soda / Ton", 17, "KG/Ton"),
  ("Corrugator", "Borax", 18, "KG"),
  ("Corrugator", "Borax / Ton", 19, "KG/Ton"),
  
  ("Flexo", "P1 & P6 Qty", 20, "pcs"),
  ("Flexo", "P1 & P6 Weight", 21, "KG"),
  ("Flexo", "P4 Qty", 22, "pcs"),
  ("Flexo", "P4 Weight", 23, "KG"),
  ("Flexo", "Total Qty", 24, "pcs"),
  ("Flexo", "Total Weight", 25, "KG"),
  ("Flexo", "Efficiency", 26, "%"),
  ("Flexo", "Utilisation", 27, "%"),
  ("Flexo", "No of Workers", 28, "count"),
  ("Flexo", "Weight/Worker", 29, "KG"),
  ("Flexo", "Hours Worked", 30, "hours"),
  ("Flexo", "Weight/Labour Hour", 31, "KG"),
  ("Flexo", "Ink", 32, "KG"),
  ("Flexo", "Ink / Ton", 33, "KG/Ton"),
  ("Flexo", "Glue", 34, "KG"),
  ("Flexo", "Bundling Rope", 35, "KG"),
  
  ("Finishing B", "Impression", 39, "nos"),
  ("Finishing B", "Weight", 40, "KG"),
  
  ("Finishing A", "Finished Qty", 42, "pcs"),
  ("Finishing A", "Weight", 43, "KG"),
  ("Finishing A", "Efficiency", 44, "%"),
  ("Finishing A", "Combined Efficiency", 45, "%"),
  ("Finishing A", "No of Workers", 46, "count"),
  ("Finishing A", "Weight/Worker", 47, "KG"),
  ("Finishing A", "Hours Worked", 48, "hours"),
  ("Finishing A", "Weight/Labour hour", 49, "KG"),
  
  # AY (50) to BB (53) - Finishing A Consumables
  ("Finishing A", "Glue", 50, "KG"), 
  ("Finishing A", "Stitching Wire", 51, "KG"),
  ("Finishing A", "Bundling Rope", 52, "KG"),
  ("Finishing A", "Strapping Tape", 53, "nos"),
  
  # BC (54) to BF (57) - Finishing B Consumables
  ("Finishing B", "Laminating Glue", 54, "KG"), 
  ("Finishing B", "Glue", 55, "KG"),
  ("Finishing B", "Bundling Rope", 56, "KG"),
  ("Finishing B", "Strapping Tape", 57, "nos"),
  
  # Factory 2 (58 to 67)
  ("Factory 2", "Impression", 58, "nos"),
  ("Factory 2", "Weight", 59, "KG"),
  ("Factory 2", "No of Workers", 60, "count"),
  ("Factory 2", "Weight/Worker", 61, "KG"),
  ("Factory 2", "Hours Worked", 62, "hours"),
  ("Factory 2", "Weight/Labour hour", 63, "KG"),
  ("Factory 2", "Chemifix", 64, "KG"),
  ("Factory 2", "Spray Chemifix", 65, "KG"),
  ("Factory 2", "Stitching Wire", 66, "KG"),
  ("Factory 2", "Bundling Rope", 67, "KG")
]

def get_or_create(session, model, **kwargs):
    instance = session.query(model).filter_by(**kwargs).first()
    if instance:
        return instance
    else:
        instance = model(**kwargs)
        session.add(instance)
        session.commit()
        session.refresh(instance)
        return instance

def safe_float(val):
    if pd.isna(val) or val is None or str(val).strip() == '' or str(val).strip() == '-':
        return 0.0
    try:
        return float(val)
    except:
        return 0.0

def process_excel_files(db: Session):
    total_records = 0
    errors = []
    
    if not os.path.exists(INPUT_DIR):
        os.makedirs(INPUT_DIR)
        
    for filename in os.listdir(INPUT_DIR):
        if filename.startswith('~') or not filename.endswith(('.xls', '.xlsx')):
            continue
            
        filepath = os.path.join(INPUT_DIR, filename)
        
        try:
            xls = pd.ExcelFile(filepath)
            
            # Record source file
            file_record = get_or_create(db, DimSourceFile, filename=filename, sheet_name="MULTIPLES")
                
            for sheet_name in xls.sheet_names:
                df = pd.read_excel(filepath, sheet_name=sheet_name, header=None)
                
                # Minimum rows check (needs at least row 8 for 1st of month)
                if len(df) < 8:
                    continue
                    
                row6_cap = df.iloc[6] # Row 7 Entitlement capacities

                # Working days extraction — section-specific cells defined by user
                # Corrugator=D42(r41,c3), Flexo=U42(r41,c20), FinishingB=AN42(r41,c39)
                # FinishingA=AQ42(r41,c42), Factory2=BG2(r1,c58)
                WORKING_DAYS_CELLS = {
                    "Corrugator":   {"row": 41, "col": 3},
                    "Flexo":        {"row": 41, "col": 20},
                    "Finishing B":  {"row": 41, "col": 39},
                    "Finishing A":  {"row": 41, "col": 42},
                    "Factory 2":    {"row": 1,  "col": 58},
                }
                    
                # Output vs Consumption hardcoded classification
                def classify_kpi(name):
                    n = name.lower()
                    if n == "orders brought in": return "Orders"
                    consumptions = ["no of workers", "hours worked", "furnace oil consumed", "corn starch", "caustic soda", "borax", "ink", "glue", "bundling rope", "stitching wire", "strapping tape", "laminating glue", "chemifix", "spray chemifix"]
                    if n in consumptions: return "Consumption"
                    outputs = ["weight", "linear meters", "square meters", "weight efficiency", "efficiency", "capacity utilisation", "utilisation", "combined efficiency", "impression", "p1 & p6 qty", "p1 & p6 weight", "p4 qty", "p4 weight", "total qty", "total weight", "finished qty"]
                    if n in outputs: return "Output"
                    return "Derived/Other"

                # Cache dimension entities to reduce DB lookups
                dim_cache = {}
                for sec, kpi, col_idx, unit in KPI_MAP:
                    if sec not in dim_cache:
                        dim_cache[sec] = get_or_create(db, DimSection, name=sec)
                    
                    kpi_key = f"{sec}_{kpi}"
                    if kpi_key not in dim_cache:
                        raw_cap = row6_cap[col_idx] if col_idx < len(row6_cap) else None
                        cap_val = float(raw_cap) if pd.notna(raw_cap) and isinstance(raw_cap, (int, float)) else None
                        
                        cat = classify_kpi(kpi)
                        
                        dim_kpi = get_or_create(db, DimKPI, name=kpi, unit=unit)
                        
                        updated = False
                        if cap_val and cap_val > 0 and dim_kpi.capacity != cap_val:
                            dim_kpi.capacity = cap_val
                            updated = True
                            
                        if dim_kpi.category != cat:
                            dim_kpi.category = cat
                            updated = True
                            
                        if updated:
                            db.commit()
                            
                        dim_cache[kpi_key] = dim_kpi

                # Extract and store working days for each section in this sheet
                # Parse year/month from sheet name e.g. "JANUARY-2026 "
                sheet_year, sheet_month = None, None
                import re
                month_map = {"JANUARY":1,"FEBRUARY":2,"MARCH":3,"APRIL":4,
                             "MAY":5,"JUNE":6,"JULY":7,"AUGUST":8,
                             "SEPTEMBER":9,"OCTOBER":10,"NOVEMBER":11,"DECEMBER":12}
                m = re.match(r'([A-Z]+)[^\d]*(\d{4})', sheet_name.strip().upper())
                if m:
                    sheet_month = month_map.get(m.group(1))
                    sheet_year = int(m.group(2))

                if sheet_year and sheet_month:
                    for sec_name, cell in WORKING_DAYS_CELLS.items():
                        r, c = cell["row"], cell["col"]
                        if r < len(df) and c < len(df.columns):
                            raw_wd = df.iloc[r, c]
                            wd_val = int(float(raw_wd)) if pd.notna(raw_wd) and isinstance(raw_wd, (int, float)) and float(raw_wd) > 0 else None
                            if wd_val:
                                sec_dim = dim_cache.get(sec_name) or db.query(DimSection).filter(DimSection.name == sec_name).first()
                                if sec_dim:
                                    # Upsert: delete old entry for same section/month/year then insert fresh
                                    db.query(FactWorkingDays).filter(
                                        FactWorkingDays.section_id == sec_dim.id,
                                        FactWorkingDays.year == sheet_year,
                                        FactWorkingDays.month == sheet_month
                                    ).delete()
                                    db.add(FactWorkingDays(
                                        section_id=sec_dim.id,
                                        file_id=file_record.id,
                                        year=sheet_year,
                                        month=sheet_month,
                                        working_days=wd_val
                                    ))
                                    db.commit()
                            
                # Start data rows from row 8 (index 7)
                for row_idx in range(7, len(df)):
                    row = df.iloc[row_idx]
                    
                    # Target Date in Col A (Index 0)
                    date_val_raw = row[0]
                    
                    if pd.isna(date_val_raw):
                        # Empty date cell, likely end of data or spacing
                        continue
                        
                    try:
                        date_val = pd.to_datetime(date_val_raw).date()
                    except:
                        continue # If it's a "Total" string or garbage
                    
                    # Determine Holiday Status
                    c_weight = safe_float(row[2]) if 2 < len(row) else 0
                    f_weight = safe_float(row[25]) if 25 < len(row) else 0
                    
                    is_holiday = 1 if (c_weight == 0 and f_weight == 0) else 0
                    
                    dim_date = db.query(DimDate).filter_by(date_val=date_val).first()
                    if not dim_date:
                        dim_date = DimDate(
                            date_val=date_val, 
                            year=date_val.year, 
                            month=date_val.month, 
                            day=date_val.day, 
                            day_of_week=date_val.weekday(),
                            is_holiday=is_holiday
                        )
                        db.add(dim_date)
                        db.commit()
                        db.refresh(dim_date)
                    elif dim_date.is_holiday != is_holiday:
                        # Update holiday status if we have new data showing it differently
                        # Treat non-holiday (0) as dominating over holiday (1) if conflicts exist
                        if is_holiday == 0:
                            dim_date.is_holiday = 0
                            db.commit()
                    
                    # Extract Data
                    for sec, kpi, col_idx, unit in KPI_MAP:
                        if col_idx < len(row):
                            val = safe_float(row[col_idx])
                            
                            # If value is a strictly decimal percentage from excel (e.g., 0.73), convert to 73. 
                            # If it's already an integer format like 81.36, leave it be.
                            if unit == "%" and val <= 5.0:
                                val = val * 100
                            
                            # Fetch Dimension IDs from cache
                            sec_id = dim_cache[sec].id
                            kpi_id = dim_cache[f"{sec}_{kpi}"].id
                            
                            existing_fact = db.query(FactKPIValue).filter_by(
                                date_id=dim_date.id,
                                section_id=sec_id,
                                kpi_id=kpi_id,
                                file_id=file_record.id
                            ).first()
                            
                            if existing_fact:
                                existing_fact.value = val
                            else:
                                fact = FactKPIValue(
                                    date_id=dim_date.id,
                                    section_id=sec_id,
                                    kpi_id=kpi_id,
                                    file_id=file_record.id,
                                    value=val
                                )
                                db.add(fact)
                                
                            total_records += 1
                            
                    # Commit per row to prevent huge RAM spikes and allow easier trace
                    db.commit()
                            
        except Exception as e:
            errors.append(f"Error processing {filename}: {str(e)}")
            logger.error(f"Error: {e}")
            
    # Log the refresh result
    status = "Warning" if errors else "Success"
    msg = f"Processed {total_records} records. " + "; ".join(errors)
    refresh_log = RefreshLog(status=status, message=msg, records_processed=total_records)
    db.add(refresh_log)
    db.commit()
    
    return refresh_log
