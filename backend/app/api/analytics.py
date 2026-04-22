from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, timedelta
import pandas as pd

from app.core.database import get_db
from app.models.schema import DimSection, DimKPI, FactKPIValue, DimDate, FactWorkingDays, DimKPIStandard, DimKPIStandardHistory

router = APIRouter()

@router.get("/summary")
def get_dashboard_summary(
    kpi_id: int,
    section_id: Optional[int] = None,
    db: Session = Depends(get_db),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    query = db.query(FactKPIValue).join(DimDate).filter(FactKPIValue.kpi_id == kpi_id)
    if section_id:
        query = query.filter(FactKPIValue.section_id == section_id)
    if start_date:
        query = query.filter(DimDate.date_val >= start_date)
    if end_date:
        query = query.filter(DimDate.date_val <= end_date)
        
    total_consumption = query.with_entities(func.sum(FactKPIValue.value)).scalar() or 0
    average_daily = query.with_entities(func.avg(FactKPIValue.value)).scalar() or 0
    
    # Best and Worst Sections (dynamically scored by capacity entitlement if exists)
    sec_query = db.query(
        DimSection.name,
        func.sum(FactKPIValue.value).label('total_value'),
        DimKPI.capacity
    ).join(FactKPIValue, DimSection.id == FactKPIValue.section_id).join(DimDate).join(DimKPI).filter(FactKPIValue.kpi_id == kpi_id)
    
    if start_date:
        sec_query = sec_query.filter(DimDate.date_val >= start_date)
    if end_date:
        sec_query = sec_query.filter(DimDate.date_val <= end_date)
        
    sections_agg = sec_query.group_by(DimSection.name, DimKPI.capacity).all()
    
    scored_sections = []
    for r in sections_agg:
        val = r.total_value or 0
        cap = r.capacity or 0
        # Formula: (Value / Capacity) * 100 if capacity exists, else pure value
        score = (val / cap * 100) if cap > 0 else val
        scored_sections.append((r.name, score))
        
    scored_sections.sort(key=lambda x: x[1], reverse=True)
    
    best_section = scored_sections[0][0] if scored_sections else "N/A"
    worst_section = scored_sections[-1][0] if scored_sections else "N/A"
    
    return {
        "total_consumption": round(total_consumption, 2),
        "average_daily": round(average_daily, 2),
        "best_section": best_section,
        "worst_section": worst_section
    }

@router.get("/trends")
def get_trends(
    kpi_id: int,
    section_id: Optional[int] = None,
    view_mode: str = 'total',
    db: Session = Depends(get_db),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    if kpi_id < 0:
        if kpi_id == -1:
            kpi_names, categories, sections, factor = ["Weight"], ["Output"], ["Corrugator"], 0.001
        elif kpi_id == -2:
            kpi_names, categories, sections, factor = ["Furnace Oil Consumed"], None, None, 1.0
        elif kpi_id == -3:
            kpi_names, categories, sections, factor = ["Glue", "Laminating Glue"], ["Consumption"], None, 1.0
        else:
            return []

        q = db.query(
            DimDate.date_val,
            func.sum(FactKPIValue.value).label('total')
        ).join(FactKPIValue, DimDate.id == FactKPIValue.date_id) \
         .join(DimKPI, DimKPI.id == FactKPIValue.kpi_id)
         
        if kpi_names: q = q.filter(DimKPI.name.in_(kpi_names))
        if categories: q = q.filter(DimKPI.category.in_(categories))
        if sections:
            sec_ids = [s.id for s in db.query(DimSection).filter(DimSection.name.in_(sections)).all()]
            q = q.filter(FactKPIValue.section_id.in_(sec_ids))
            
        q = q.filter(FactKPIValue.value.isnot(None), FactKPIValue.value > 0)

        if start_date: q = q.filter(DimDate.date_val >= start_date)
        if end_date: q = q.filter(DimDate.date_val <= end_date)
        
        results_raw = q.group_by(DimDate.date_val).having(
            func.sum(FactKPIValue.value) > 0
        ).order_by(DimDate.date_val).all()
        
        results = [(r.date_val, float(r.total) * factor) for r in results_raw]
        
    else:
        # Daily aggregate for a specific KPI - only working days (non-zero production)
        query = db.query(
            DimDate.date_val,
            func.sum(FactKPIValue.value).label('total')
        ).join(FactKPIValue).filter(
            FactKPIValue.kpi_id == kpi_id,
            FactKPIValue.value.isnot(None),
            FactKPIValue.value > 0       # Exclude non-working days (zero production)
        )
        
        if section_id and section_id > 0:
            query = query.filter(FactKPIValue.section_id == section_id)
        if start_date:
            query = query.filter(DimDate.date_val >= start_date)
        if end_date:
            query = query.filter(DimDate.date_val <= end_date)
            
        results_raw = query.group_by(DimDate.date_val).having(
            func.sum(FactKPIValue.value) > 0  # Extra guard at group level
        ).order_by(DimDate.date_val).all()
        results = [(r.date_val, float(r.total)) for r in results_raw]
        
    # Scale by daily tonnage if view_mode is 'per_ton'
    if view_mode == 'per_ton':
        weight_kpis = db.query(DimKPI.id).filter(
            DimKPI.name.in_(["Weight", "Total Weight"]), 
            DimKPI.category == "Output"
        ).all()
        weight_kpi_ids = [k[0] for k in weight_kpis]
        
        if weight_kpi_ids:
            wt_q = db.query(
                DimDate.date_val,
                func.sum(FactKPIValue.value)
            ).join(FactKPIValue, DimDate.id == FactKPIValue.date_id) \
             .filter(FactKPIValue.kpi_id.in_(weight_kpi_ids), FactKPIValue.value > 0)
             
            if section_id and section_id > 0:
                wt_q = wt_q.filter(FactKPIValue.section_id == section_id)
            if start_date: wt_q = wt_q.filter(DimDate.date_val >= start_date)
            if end_date: wt_q = wt_q.filter(DimDate.date_val <= end_date)
            
            wt_results = wt_q.group_by(DimDate.date_val).having(func.sum(FactKPIValue.value) > 0).all()
            daily_tons = {r[0]: float(r[1]) / 1000.0 for r in wt_results}
            
            normalized_results = []
            for date_val, tot in results:
                tons = daily_tons.get(date_val, 0)
                if tons > 0:
                    normalized_results.append((date_val, tot / tons))
            results = normalized_results

    # Calculate 7-day moving average using pandas for ease
    if not results:
        return []
        
    df = pd.DataFrame(results, columns=["date", "total"])
    df["date"] = pd.to_datetime(df["date"]).dt.strftime('%Y-%m-%d')
    df["moving_avg_7d"] = df['total'].rolling(window=7, min_periods=1).mean()
    
    # Basic anomaly detection (Z-score approach)
    mean = df['total'].mean()
    std = df['total'].std()
    
    anomalies = []
    # std can be NaN or 0 if single row or no variance
    if pd.notna(std) and std > 0:
        df["z_score"] = (df['total'] - mean) / std
        df["is_anomaly"] = df["z_score"].abs() > 2.0
    else:
        df["is_anomaly"] = False
        
    return df.to_dict(orient="records")

@router.get("/sections")
def get_section_contributions(
    kpi_id: int,
    db: Session = Depends(get_db),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    query = db.query(
        DimSection.name,
        func.sum(FactKPIValue.value).label('total_value')
    ).join(FactKPIValue, DimSection.id == FactKPIValue.section_id).join(DimDate).filter(FactKPIValue.kpi_id == kpi_id)
    
    if start_date:
        query = query.filter(DimDate.date_val >= start_date)
    if end_date:
        query = query.filter(DimDate.date_val <= end_date)
        
    results = query.group_by(DimSection.name).order_by(func.sum(FactKPIValue.value).desc()).all()
    
    return [{"name": r[0], "value": r[1] if r[1] is not None else 0} for r in results]


@router.get("/category_summary")
def get_category_summary(
    section_id: int,
    category: str,
    db: Session = Depends(get_db),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    PERCENTAGE_UNITS = {'%', 'percent', 'pct'}

    if section_id == 0:
        def query_sum(kpi_names, categories=None, sections=None):
            # Join FactKPIValue -> DimKPI and DimDate
            q = db.query(func.sum(FactKPIValue.value))\
                .select_from(FactKPIValue)\
                .join(DimKPI, DimKPI.id == FactKPIValue.kpi_id)\
                .join(DimDate, DimDate.id == FactKPIValue.date_id)
            
            if kpi_names: q = q.filter(DimKPI.name.in_(kpi_names))
            if categories: q = q.filter(DimKPI.category.in_(categories))
            
            if sections:
                sec_ids = [s.id for s in db.query(DimSection).filter(DimSection.name.in_(sections)).all()]
                q = q.filter(FactKPIValue.section_id.in_(sec_ids))
                
            if start_date: q = q.filter(DimDate.date_val >= start_date)
            if end_date: q = q.filter(DimDate.date_val <= end_date)
            
            val = q.scalar()
            return float(val) if val else 0.0

        corr_kg = query_sum(["Weight"], ["Output"], ["Corrugator"])
        corr_mt = round(corr_kg / 1000, 2)
        
        fo_l = query_sum(["Furnace Oil Consumed"])
        glue_kg = query_sum(["Glue", "Laminating Glue"], ["Consumption"])
        
        def get_working_days(section_names=None):
            wd_q = db.query(func.count(func.distinct(DimDate.date_val)))\
                .select_from(FactKPIValue)\
                .join(DimDate, DimDate.id == FactKPIValue.date_id)\
                .join(DimKPI, DimKPI.id == FactKPIValue.kpi_id)\
                .filter(FactKPIValue.value > 0, DimKPI.category == "Output")
            
            if section_names:
                wd_q = wd_q.join(DimSection, DimSection.id == FactKPIValue.section_id)\
                           .filter(DimSection.name.in_(section_names))
                           
            if start_date: wd_q = wd_q.filter(DimDate.date_val >= start_date)
            if end_date: wd_q = wd_q.filter(DimDate.date_val <= end_date)
            return wd_q.scalar() or None

        corr_wd = get_working_days(["Corrugator"])
        factory_wd = get_working_days()

        # ── Precise Glue period standard: per-section std × per-section working days ──
        # Fetches every section that has a Glue or Laminating Glue standard,
        # then multiplies each section's per-day rate by that section's own
        # distinct Output working days in the selected date range.
        glue_std_rows = (
            db.query(
                DimKPIStandard.section_id,
                DimKPIStandard.standard_value,
                DimKPIStandard.period_type,
                DimKPI.name.label("kpi_name"),
            )
            .join(DimKPI, DimKPI.id == DimKPIStandard.kpi_id)
            .filter(DimKPI.name.in_(["Glue", "Laminating Glue"]))
            .all()
        )

        glue_pre_computed_std = None
        if glue_std_rows:
            total_glue_std = 0.0
            for row in glue_std_rows:
                # Working days for this specific section
                sec_wd_q = (
                    db.query(func.count(func.distinct(DimDate.date_val)))
                    .select_from(FactKPIValue)
                    .join(DimDate, DimDate.id == FactKPIValue.date_id)
                    .join(DimKPI, DimKPI.id == FactKPIValue.kpi_id)
                    .filter(
                        FactKPIValue.section_id == row.section_id,
                        FactKPIValue.value > 0,
                        DimKPI.category == "Output",
                    )
                )
                if start_date: sec_wd_q = sec_wd_q.filter(DimDate.date_val >= start_date)
                if end_date:   sec_wd_q = sec_wd_q.filter(DimDate.date_val <= end_date)
                sec_wd = sec_wd_q.scalar() or 0

                if row.period_type == "day":
                    total_glue_std += row.standard_value * sec_wd
                # per-ton Glue standards not yet supported in Overall view

            glue_pre_computed_std = round(total_glue_std, 2) if total_glue_std > 0 else None

        return [
            {"kpi_id": -1, "kpi_name": "Corrugator MT", "unit": "MT", "value": corr_mt, "aggregation": "sum", "working_days": corr_wd, "total_weight_kg": corr_kg},
            {"kpi_id": -2, "kpi_name": "Furnace Oil", "unit": "Liters", "value": round(fo_l, 2), "aggregation": "sum", "working_days": corr_wd, "total_weight_kg": corr_kg},
            {"kpi_id": -3, "kpi_name": "Glue", "unit": "KG", "value": round(glue_kg, 2), "aggregation": "sum", "working_days": None, "total_weight_kg": corr_kg, "pre_computed_period_std": glue_pre_computed_std},
            {"kpi_id": -4, "kpi_name": "Waste %", "unit": "%", "value": "N/A", "aggregation": "sum", "working_days": factory_wd, "total_weight_kg": corr_kg},
        ]


    # Count actual working days from fact data: distinct dates with non-zero
    # production in the exact selected date range.  Using the monthly
    # FactWorkingDays aggregate would return the full-month count even for
    # partial-month selections (e.g. 20/03–31/03 would give 22 days instead of ~8).
    wd_query = db.query(
        func.count(func.distinct(DimDate.date_val))
    ).join(
        FactKPIValue, DimDate.id == FactKPIValue.date_id
    ).join(
        DimKPI, DimKPI.id == FactKPIValue.kpi_id
    ).filter(
        FactKPIValue.section_id == section_id,
        FactKPIValue.value.isnot(None),
        FactKPIValue.value > 0,
        DimKPI.category == "Output"
    )
    if start_date:
        wd_query = wd_query.filter(DimDate.date_val >= start_date)
    if end_date:
        wd_query = wd_query.filter(DimDate.date_val <= end_date)
    total_working_days = wd_query.scalar() or None

    # Total corrugator/flexo output weight (KG) for the period — needed by the frontend
    # to convert a per-ton standard into a total-period benchmark.
    weight_kpis = db.query(DimKPI.id).filter(
        DimKPI.name.in_(["Weight", "Total Weight"]), 
        DimKPI.category == "Output"
    ).all()
    weight_kpi_ids = [k[0] for k in weight_kpis]

    total_weight_kg = None
    if weight_kpi_ids:
        wt_query = db.query(func.sum(FactKPIValue.value)).join(
            DimDate, DimDate.id == FactKPIValue.date_id
        ).filter(
            FactKPIValue.section_id == section_id,
            FactKPIValue.kpi_id.in_(weight_kpi_ids),
            FactKPIValue.value > 0
        )
        if start_date:
            wt_query = wt_query.filter(DimDate.date_val >= start_date)
        if end_date:
            wt_query = wt_query.filter(DimDate.date_val <= end_date)
        raw_kg = wt_query.scalar()
        total_weight_kg = round(float(raw_kg), 2) if raw_kg else None

    # Fetch KPI totals
    query = db.query(
        DimKPI.id,
        DimKPI.name.label('kpi_name'),
        DimKPI.unit,
        func.sum(FactKPIValue.value).label('total_sum')
    ).join(FactKPIValue, DimKPI.id == FactKPIValue.kpi_id
    ).join(DimDate, DimDate.id == FactKPIValue.date_id
    ).filter(
        FactKPIValue.section_id == section_id,
        DimKPI.category == category,
        FactKPIValue.value.isnot(None)
    )

    if start_date:
        query = query.filter(DimDate.date_val >= start_date)
    if end_date:
        query = query.filter(DimDate.date_val <= end_date)

    results = query.group_by(DimKPI.id).all()

    output = []
    for r in results:
        is_pct = r.unit and r.unit.strip().lower() in PERCENTAGE_UNITS
        total = float(r.total_sum) if r.total_sum is not None else 0

        if is_pct:
            # Divide by actual working days, not calendar days or data row count
            value = round(total / total_working_days, 2) if total_working_days else round(total, 2)
        else:
            value = round(total, 2)

        output.append({
            "kpi_id": r.id,
            "kpi_name": r.kpi_name,
            "unit": r.unit,
            "value": value,
            "aggregation": "avg_working_days" if is_pct else "sum",
            "working_days": total_working_days,
            "total_weight_kg": total_weight_kg,   # corrugator output for period (KG)
        })

    return output


@router.get("/category_daily_matrix")
def get_category_daily_matrix(
    section_id: int,
    category: str,
    db: Session = Depends(get_db),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    if section_id == 0:
        return {"dates": [], "series": []}

    query = db.query(
        DimKPI.id.label('kpi_id'),
        DimKPI.name.label('kpi_name'),
        DimKPI.unit,
        DimDate.date_val,
        func.sum(FactKPIValue.value).label('daily_value')
    ).join(
        FactKPIValue, DimKPI.id == FactKPIValue.kpi_id
    ).join(
        DimDate, DimDate.id == FactKPIValue.date_id
    ).filter(
        FactKPIValue.section_id == section_id,
        DimKPI.category == category,
        FactKPIValue.value.isnot(None),
        FactKPIValue.value > 0
    )

    if start_date:
        query = query.filter(DimDate.date_val >= start_date)
    if end_date:
        query = query.filter(DimDate.date_val <= end_date)

    results = query.group_by(DimKPI.id, DimKPI.name, DimKPI.unit, DimDate.date_val).order_by(DimDate.date_val).all()
    
    dates_set = set()
    kpi_series = {}
    
    for r in results:
        d_str = r.date_val.strftime('%Y-%m-%d')
        dates_set.add(d_str)
        if r.kpi_id not in kpi_series:
            kpi_series[r.kpi_id] = {
                "kpi_id": r.kpi_id,
                "kpi_name": r.kpi_name,
                "unit": r.unit,
                "data_points": {}
            }
        kpi_series[r.kpi_id]["data_points"][d_str] = round(float(r.daily_value), 2)
        
    dates = sorted(list(dates_set))
    
    series_list = []
    for kpi in kpi_series.values():
        values_array = []
        for d in dates:
            values_array.append(kpi["data_points"].get(d, None))
        series_list.append({
            "kpi_id": kpi["kpi_id"],
            "kpi_name": kpi["kpi_name"],
            "unit": kpi["unit"],
            "values": values_array
        })
        
    return {
        "dates": dates,
        "series": series_list
    }


@router.get("/category_per_ton")
def get_category_per_ton(
    section_id: int,
    db: Session = Depends(get_db),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    """Returns consumption KPIs expressed per ton of Weight produced.
    Excludes non-material KPIs (Workers, Hours). Only meaningful for Consumption category."""
    
    if section_id == 0:
        return []

    # KPIs to exclude from per-ton view (not material consumptions)
    EXCLUDE_NAMES = {'no of workers', 'hours worked'}

    # Step 1: Get total weight (KG) produced by this section in the period
    # For Corrugator/Finishing it is "Weight", for Flexo it is "Total Weight"
    weight_kpis = db.query(DimKPI.id).filter(
        DimKPI.name.in_(["Weight", "Total Weight"]), 
        DimKPI.category == "Output"
    ).all()
    weight_kpi_ids = [k[0] for k in weight_kpis]

    if not weight_kpi_ids:
        return []

    wt_query = db.query(func.sum(FactKPIValue.value)).join(
        DimDate, DimDate.id == FactKPIValue.date_id
    ).filter(
        FactKPIValue.section_id == section_id,
        FactKPIValue.kpi_id.in_(weight_kpi_ids),
        FactKPIValue.value > 0
    )
    if start_date:
        wt_query = wt_query.filter(DimDate.date_val >= start_date)
    if end_date:
        wt_query = wt_query.filter(DimDate.date_val <= end_date)

    total_weight_kg = wt_query.scalar() or 0
    total_weight_tons = total_weight_kg / 1000 if total_weight_kg > 0 else None

    # Step 2: Get totals for all Consumption KPIs, excluding non-material ones
    con_query = db.query(
        DimKPI.id,
        DimKPI.name.label('kpi_name'),
        DimKPI.unit,
        func.sum(FactKPIValue.value).label('total_sum')
    ).join(FactKPIValue, DimKPI.id == FactKPIValue.kpi_id
    ).join(DimDate, DimDate.id == FactKPIValue.date_id
    ).filter(
        FactKPIValue.section_id == section_id,
        DimKPI.category == "Consumption",
        FactKPIValue.value.isnot(None)
    )
    if start_date:
        con_query = con_query.filter(DimDate.date_val >= start_date)
    if end_date:
        con_query = con_query.filter(DimDate.date_val <= end_date)

    results = con_query.group_by(DimKPI.id).all()

    # Step 3: Get working days and standards for deviation calculation
    wd_q = (
        db.query(func.count(func.distinct(DimDate.date_val)))
        .select_from(FactKPIValue)
        .join(DimDate, DimDate.id == FactKPIValue.date_id)
        .join(DimKPI, DimKPI.id == FactKPIValue.kpi_id)
        .filter(
            FactKPIValue.section_id == section_id,
            FactKPIValue.value > 0,
            DimKPI.category == "Output"
        )
    )
    if start_date: wd_q = wd_q.filter(DimDate.date_val >= start_date)
    if end_date:   wd_q = wd_q.filter(DimDate.date_val <= end_date)
    working_days = wd_q.scalar() or 0

    std_rows = db.query(DimKPIStandard).filter(DimKPIStandard.section_id == section_id).all()
    std_map = {r.kpi_id: r for r in std_rows}
    results = con_query.group_by(DimKPI.id).all()

    output = []
    for r in results:
        if r.kpi_name.lower() in EXCLUDE_NAMES:
            continue
        total = float(r.total_sum) if r.total_sum else 0
        per_ton = round(total / total_weight_tons, 4) if total_weight_tons else 0

        std = std_map.get(r.id)
        deviation = None
        period_std = None
        if std:
            if std.period_type == "ton" and total_weight_tons:
                period_std = std.standard_value * total_weight_tons
            elif std.period_type == "day" and working_days:
                period_std = std.standard_value * working_days
            if period_std and period_std > 0:
                deviation = round(((total - period_std) / period_std) * 100, 1)

        output.append({
            "kpi_id": r.id,
            "kpi_name": r.kpi_name,
            "unit": f"{r.unit}/Ton" if r.unit else "per Ton",
            "value": per_ton,
            "total_weight_tons": round(total_weight_tons, 2) if total_weight_tons else 0,
            "aggregation": "per_ton",
            "deviation": deviation
        })

    return output


@router.get("/utilities")
def get_utilities(
    section_id: int,
    db: Session = Depends(get_db),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
):
    """
    Returns utility KPI totals (Electricity, Water, Wastewater) for the requested period.
    Data is always fetched from the 'Utilities' section in dim_section regardless of the
    section_id filter — section_id only controls which KPI subset is returned:
      - 0 (Overall): Electricity Usage, Water - Main Meter, Wastewater Plant
      - >0 (section): Electricity Usage, Water - Cafeteria, Water - Printer 04, Wastewater Plant
    """
    utils_section = db.query(DimSection).filter(DimSection.name == "Utilities").first()
    if not utils_section:
        return []

    # KPI subset based on view context
    if int(section_id) == 0:
        kpi_names = ["Electricity Usage", "Water - Main Meter", "Water - Cafeteria", "Water - Printer 04", "Wastewater Plant"]
    else:
        kpi_names = ["Electricity Usage", "Water - Cafeteria", "Water - Printer 04", "Wastewater Plant"]

    query = (
        db.query(
            DimKPI.id,
            DimKPI.name.label("kpi_name"),
            DimKPI.unit,
            func.sum(FactKPIValue.value).label("total_sum"),
        )
        .join(FactKPIValue, DimKPI.id == FactKPIValue.kpi_id)
        .join(DimDate, DimDate.id == FactKPIValue.date_id)
        .filter(
            FactKPIValue.section_id == utils_section.id,
            DimKPI.name.in_(kpi_names),
            FactKPIValue.value.isnot(None),
            FactKPIValue.value > 0,
        )
    )
    if start_date:
        query = query.filter(DimDate.date_val >= start_date)
    if end_date:
        query = query.filter(DimDate.date_val <= end_date)

    results = query.group_by(DimKPI.id, DimKPI.name, DimKPI.unit).all()
    result_map = {r.kpi_name: r for r in results}

    output = []
    for name in kpi_names:
        if name in result_map:
            r = result_map[name]
            output.append({
                "kpi_id": r.id,
                "kpi_name": r.kpi_name,
                "unit": r.unit,
                "value": round(float(r.total_sum), 2),
                "aggregation": "sum",
                "working_days": None,
                "total_weight_kg": None,
            })
        else:
            # KPI defined in DB but no data for this period — show as zero
            kpi_dim = (
                db.query(DimKPI)
                .filter(DimKPI.name == name, DimKPI.category == "Utilities")
                .first()
            )
            if kpi_dim:
                output.append({
                    "kpi_id": kpi_dim.id,
                    "kpi_name": kpi_dim.name,
                    "unit": kpi_dim.unit,
                    "value": 0,
                    "aggregation": "sum",
                    "working_days": None,
                    "total_weight_kg": None,
                })

    return output


@router.get("/standards")
def get_standards(
    section_id: int,
    db: Session = Depends(get_db)
):
    """Returns all user-defined benchmark standards for a section. In overall section, maps underlying targets to synthetic KPIs."""
    if section_id == 0:
        all_stds = db.query(
            DimKPIStandard.standard_value,
            DimKPIStandard.period_type,
            DimKPI.name.label('kpi_name'),
            DimKPI.unit,
            DimKPI.category,
            DimSection.name.label('section_name')
        ).join(DimKPI, DimKPI.id == DimKPIStandard.kpi_id).join(DimSection, DimSection.id == DimKPIStandard.section_id).all()

        output = []

        # ── Helper: aggregate a list of standard rows into a single combined standard.
        # For per-day or per-ton: sum all values of the dominant period_type.
        # If there's a mix of day/ton, prefer whichever appears more often.
        def _aggregate_stds(rows):
            if not rows:
                return None
            # Count period_types
            type_counts = {}
            for r in rows:
                type_counts[r.period_type] = type_counts.get(r.period_type, 0) + 1
            dominant_type = max(type_counts, key=type_counts.get)
            # Sum values for the dominant period_type
            total = sum(r.standard_value for r in rows if r.period_type == dominant_type)
            return {"standard_value": total, "period_type": dominant_type, "category": rows[0].category}

        # ── Corrugator MT: aggregate all "Weight" (Output) standards across Corrugator section ──
        weight_stds = [r for r in all_stds if r.kpi_name == "Weight" and r.category == "Output" and r.section_name == "Corrugator"]
        if weight_stds:
            agg = _aggregate_stds(weight_stds)
            scaled_val = agg["standard_value"] / 1000  # KG → MT
            output.append({"kpi_id": -1, "kpi_name": "Corrugator MT", "unit": "MT",
                            "category": agg["category"], "standard_value": scaled_val,
                            "period_type": agg["period_type"]})

        # ── Furnace Oil: aggregate all "Furnace Oil Consumed" standards across sections ──
        fo_stds = [r for r in all_stds if r.kpi_name == "Furnace Oil Consumed"]
        if fo_stds:
            agg = _aggregate_stds(fo_stds)
            output.append({"kpi_id": -2, "kpi_name": "Furnace Oil", "unit": "Liters",
                            "category": agg["category"], "standard_value": agg["standard_value"],
                            "period_type": agg["period_type"]})

        # ── Glue: aggregate ALL "Glue" + "Laminating Glue" standards across ALL sections ──
        # The overall Glue KPI value is the sum of both KPI names across all sections,
        # so the standard must be the combined sum of all their per-section standards.
        glue_stds = [r for r in all_stds if r.kpi_name in ("Glue", "Laminating Glue")]
        if glue_stds:
            agg = _aggregate_stds(glue_stds)
            output.append({"kpi_id": -3, "kpi_name": "Glue", "unit": "KG",
                            "category": agg["category"], "standard_value": agg["standard_value"],
                            "period_type": agg["period_type"]})

        return output

    rows = db.query(
        DimKPIStandard.kpi_id,
        DimKPIStandard.standard_value,
        DimKPIStandard.period_type,
        DimKPI.name.label('kpi_name'),
        DimKPI.unit,
        DimKPI.category,
    ).join(DimKPI, DimKPI.id == DimKPIStandard.kpi_id
    ).filter(DimKPIStandard.section_id == section_id).all()

    return [
        {
            "kpi_id": r.kpi_id,
            "kpi_name": r.kpi_name,
            "unit": r.unit,
            "category": r.category,
            "standard_value": r.standard_value,
            "period_type": r.period_type
        }
        for r in rows
    ]


@router.post("/standards")
def upsert_standard(
    section_id: int,
    kpi_id: int,
    standard_value: float,
    period_type: str = "day",
    db: Session = Depends(get_db)
):
    """Create or update a KPI standard for a section."""
    existing = db.query(DimKPIStandard).filter(
        DimKPIStandard.section_id == section_id,
        DimKPIStandard.kpi_id == kpi_id
    ).first()

    if existing:
        existing.standard_value = standard_value
        existing.period_type = period_type
    else:
        db.add(DimKPIStandard(
            section_id=section_id,
            kpi_id=kpi_id,
            standard_value=standard_value,
            period_type=period_type
        ))

    # Always write history entry
    db.add(DimKPIStandardHistory(
        section_id=section_id,
        kpi_id=kpi_id,
        standard_value=standard_value,
        period_type=period_type
    ))
    db.commit()
    return {"status": "ok", "section_id": section_id, "kpi_id": kpi_id, "standard_value": standard_value, "period_type": period_type}


@router.get("/standards/history")
def get_standards_history(
    section_id: int,
    kpi_id: int,
    db: Session = Depends(get_db)
):
    """Returns the save history for a specific KPI standard, newest first."""
    rows = db.query(
        DimKPIStandardHistory.standard_value,
        DimKPIStandardHistory.period_type,
        DimKPIStandardHistory.saved_at
    ).filter(
        DimKPIStandardHistory.section_id == section_id,
        DimKPIStandardHistory.kpi_id == kpi_id
    ).order_by(DimKPIStandardHistory.saved_at.desc()).all()

    return [
        {
            "standard_value": r.standard_value,
            "period_type": r.period_type,
            "saved_at": r.saved_at.isoformat() if r.saved_at else None
        }
        for r in rows
    ]


@router.delete("/standards")
def delete_standard(
    section_id: int,
    kpi_id: int,
    db: Session = Depends(get_db)
):
    """Removes the active standard for a KPI. History is retained."""
    deleted = db.query(DimKPIStandard).filter(
        DimKPIStandard.section_id == section_id,
        DimKPIStandard.kpi_id == kpi_id
    ).first()
    if deleted:
        db.delete(deleted)
        db.commit()
        return {"status": "deleted"}
    return {"status": "not_found"}


@router.get("/cross_section_summary")
def get_cross_section_summary(
    db: Session = Depends(get_db),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
):
    """
    Returns a single payload with every active section's output and ALL consumption KPIs
    for the selected period. Used by the Analytics page to compare departments side-by-side.
    Each section entry contains:
      - section_id, section_name
      - output_mt   (corrugator/flexo weight in metric tons)
      - total_weight_kg  (for per-ton calculations)
      - working_days
      - consumption: list of { kpi_id, kpi_name, unit, total, per_ton }
    """
    EXCLUDE_NAMES = {'no of workers', 'hours worked'}

    # ── All sections that have any fact data in the period ──
    sections = db.query(DimSection).order_by(DimSection.id).all()

    # ── Find weight KPI ids (Output category) ──
    weight_kpi_ids = [
        k.id for k in db.query(DimKPI.id).filter(
            DimKPI.name.in_(["Weight", "Total Weight"]),
            DimKPI.category == "Output"
        ).all()
    ]

    result = []

    for section in sections:
        sid = section.id

        # ── Working days: distinct dates with any non-zero value ──
        wd_q = (
            db.query(func.count(func.distinct(DimDate.date_val)))
            .select_from(FactKPIValue)
            .join(DimDate, DimDate.id == FactKPIValue.date_id)
            .join(DimKPI, DimKPI.id == FactKPIValue.kpi_id)
            .filter(
                FactKPIValue.section_id == sid, 
                FactKPIValue.value > 0,
                DimKPI.category == "Output"
            )
        )
        if start_date: wd_q = wd_q.filter(DimDate.date_val >= start_date)
        if end_date:   wd_q = wd_q.filter(DimDate.date_val <= end_date)
        working_days = wd_q.scalar() or 0

        # Skip sections with no activity in the period
        if working_days == 0:
            continue

        # ── Output weight (KG → MT) ──
        total_weight_kg = 0.0
        if weight_kpi_ids:
            wt_q = (
                db.query(func.sum(FactKPIValue.value))
                .join(DimDate, DimDate.id == FactKPIValue.date_id)
                .filter(
                    FactKPIValue.section_id == sid,
                    FactKPIValue.kpi_id.in_(weight_kpi_ids),
                    FactKPIValue.value > 0
                )
            )
            if start_date: wt_q = wt_q.filter(DimDate.date_val >= start_date)
            if end_date:   wt_q = wt_q.filter(DimDate.date_val <= end_date)
            raw = wt_q.scalar()
            total_weight_kg = float(raw) if raw else 0.0

        output_mt = round(total_weight_kg / 1000, 3)
        total_weight_tons = total_weight_kg / 1000 if total_weight_kg > 0 else None

        # ── All Consumption KPIs for this section ──
        con_q = (
            db.query(
                DimKPI.id.label("kpi_id"),
                DimKPI.name.label("kpi_name"),
                DimKPI.unit,
                func.sum(FactKPIValue.value).label("total_sum"),
            )
            .join(FactKPIValue, DimKPI.id == FactKPIValue.kpi_id)
            .join(DimDate, DimDate.id == FactKPIValue.date_id)
            .filter(
                FactKPIValue.section_id == sid,
                DimKPI.category == "Consumption",
                FactKPIValue.value.isnot(None),
            )
        )
        if start_date: con_q = con_q.filter(DimDate.date_val >= start_date)
        if end_date:   con_q = con_q.filter(DimDate.date_val <= end_date)
        con_rows = con_q.group_by(DimKPI.id).all()

        # ── Fetch standards for this section ──
        std_rows = (
            db.query(DimKPIStandard.kpi_id, DimKPIStandard.standard_value, DimKPIStandard.period_type)
            .filter(DimKPIStandard.section_id == sid)
            .all()
        )
        std_map = {r.kpi_id: r for r in std_rows}

        consumption = []
        for r in con_rows:
            if r.kpi_name.lower() in EXCLUDE_NAMES:
                continue
            total = float(r.total_sum) if r.total_sum else 0.0
            per_ton = round(total / total_weight_tons, 4) if total_weight_tons else None

            # Compute benchmark deviation
            std = std_map.get(r.kpi_id)
            deviation = None
            period_std = None
            if std:
                if std.period_type == "ton" and total_weight_tons:
                    period_std = round(std.standard_value * total_weight_tons, 2)
                elif std.period_type == "day" and working_days:
                    period_std = round(std.standard_value * working_days, 2)
                if period_std and period_std > 0:
                    deviation = round(((total - period_std) / period_std) * 100, 1)

            consumption.append({
                "kpi_id":       r.kpi_id,
                "kpi_name":     r.kpi_name,
                "unit":         r.unit,
                "total":        round(total, 2),
                "per_ton":      per_ton,
                "period_std":   period_std,
                "deviation":    deviation,   # positive = over benchmark, negative = under
                "std_period_type": std.period_type if std else None,
            })

        result.append({
            "section_id":      sid,
            "section_name":    section.name,
            "output_mt":       output_mt,
            "total_weight_kg": round(total_weight_kg, 2),
            "working_days":    working_days,
            "consumption":     consumption,
        })

    return result
