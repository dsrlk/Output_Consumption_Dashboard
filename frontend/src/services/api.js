import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, orderBy, limit as fbLimit, getCountFromServer } from 'firebase/firestore';

import { processExcelFile } from '../utils/excelParser';

// Auth is now local dummy or Firebase Auth. We keep a simple dummy for now.
export const verifyAuth = async (password) => {
    if (password === 'Exp-156@admin') {
        return { success: true, token: 'Exp-156@admin' };
    }
    throw new Error('Invalid password');
};

// Upload Pipeline
export const uploadFile = async (file, onProgress) => {
    const result = await processExcelFile(file, onProgress);
    // Save status to Firestore
    await setDoc(doc(db, 'system', 'status'), {
        status: result.status,
        records_processed: result.recordsProcessed,
        last_refresh: new Date().toISOString()
    });
    return result;
};

export const triggerRefresh = async () => {
    return { status: "Success", message: "Rescan complete" };
};

export const getStatus = async () => {
    try {
        const snap = await getDoc(doc(db, 'system', 'status'));
        if (snap.exists()) return snap.data();
    } catch (e) { console.error(e); }
    return { status: "Success", records_processed: 0, last_refresh: new Date().toISOString() };
}

const SECTIONS = [
  { id: 1, name: "Sales" },
  { id: 2, name: "Corrugator" },
  { id: 3, name: "Flexo" },
  { id: 4, name: "Finishing A" },
  { id: 5, name: "Finishing B" },
  { id: 6, name: "Factory 2" },
  { id: 7, name: "Utilities" },
  { id: 8, name: "Waste" }
];

const KPI_LIST = [
  { id: 1, section_id: 1, name: "Orders Brought In", category: "Orders", unit: "KG" },
  { id: 2, section_id: 2, name: "Weight", category: "Output", unit: "KG" },
  { id: 3, section_id: 2, name: "Linear Meters", category: "Output", unit: "LMTS" },
  { id: 4, section_id: 2, name: "Square Meters", category: "Output", unit: "SQM" },
  { id: 5, section_id: 2, name: "Weight Efficiency", category: "Output", unit: "%" },
  { id: 6, section_id: 2, name: "Capacity Utilisation", category: "Output", unit: "%" },
  { id: 7, section_id: 2, name: "No of Workers", category: "Consumption", unit: "count" },
  { id: 8, section_id: 2, name: "Weight/Worker", category: "Output", unit: "KG" },
  { id: 9, section_id: 2, name: "Hours Worked", category: "Consumption", unit: "hours" },
  { id: 10, section_id: 2, name: "Weight/Labour Hour", category: "Output", unit: "KG" },
  { id: 11, section_id: 2, name: "Furnace Oil Consumed", category: "Consumption", unit: "Liters" },
  { id: 12, section_id: 2, name: "Furnace Oil/Ton", category: "Derived/Other", unit: "Liters/Ton" },
  { id: 13, section_id: 2, name: "Corn Starch", category: "Consumption", unit: "KG" },
  { id: 14, section_id: 2, name: "Starch", category: "Derived/Other", unit: "KG" },
  { id: 15, section_id: 2, name: "Starch / Ton", category: "Derived/Other", unit: "KG/Ton" },
  { id: 16, section_id: 2, name: "Caustic Soda", category: "Consumption", unit: "KG" },
  { id: 17, section_id: 2, name: "Caustic Soda / Ton", category: "Derived/Other", unit: "KG/Ton" },
  { id: 18, section_id: 2, name: "Borax", category: "Consumption", unit: "KG" },
  { id: 19, section_id: 2, name: "Borax / Ton", category: "Derived/Other", unit: "KG/Ton" },
  { id: 20, section_id: 3, name: "P1 & P6 Qty", category: "Output", unit: "pcs" },
  { id: 21, section_id: 3, name: "P1 & P6 Weight", category: "Output", unit: "KG" },
  { id: 22, section_id: 3, name: "P4 Qty", category: "Output", unit: "pcs" },
  { id: 23, section_id: 3, name: "P4 Weight", category: "Output", unit: "KG" },
  { id: 24, section_id: 3, name: "Total Qty", category: "Output", unit: "pcs" },
  { id: 25, section_id: 3, name: "Total Weight", category: "Output", unit: "KG" },
  { id: 26, section_id: 3, name: "Efficiency", category: "Output", unit: "%" },
  { id: 27, section_id: 3, name: "Utilisation", category: "Output", unit: "%" },
  { id: 28, section_id: 3, name: "No of Workers", category: "Consumption", unit: "count" },
  { id: 29, section_id: 3, name: "Weight/Worker", category: "Derived/Other", unit: "KG" },
  { id: 30, section_id: 3, name: "Hours Worked", category: "Consumption", unit: "hours" },
  { id: 31, section_id: 3, name: "Weight/Labour Hour", category: "Derived/Other", unit: "KG" },
  { id: 32, section_id: 3, name: "Ink", category: "Consumption", unit: "KG" },
  { id: 33, section_id: 3, name: "Ink / Ton", category: "Derived/Other", unit: "KG/Ton" },
  { id: 34, section_id: 3, name: "Glue", category: "Consumption", unit: "KG" },
  { id: 35, section_id: 3, name: "Bundling Rope", category: "Consumption", unit: "KG" },
  { id: 39, section_id: 5, name: "Impression", category: "Output", unit: "nos" },
  { id: 40, section_id: 5, name: "Weight", category: "Output", unit: "KG" },
  { id: 42, section_id: 4, name: "Finished Qty", category: "Output", unit: "pcs" },
  { id: 43, section_id: 4, name: "Weight", category: "Output", unit: "KG" },
  { id: 44, section_id: 4, name: "Efficiency", category: "Output", unit: "%" },
  { id: 45, section_id: 4, name: "Combined Efficiency", category: "Output", unit: "%" },
  { id: 46, section_id: 4, name: "No of Workers", category: "Consumption", unit: "count" },
  { id: 47, section_id: 4, name: "Weight/Worker", category: "Derived/Other", unit: "KG" },
  { id: 48, section_id: 4, name: "Hours Worked", category: "Consumption", unit: "hours" },
  { id: 49, section_id: 4, name: "Weight/Labour hour", category: "Derived/Other", unit: "KG" },
  { id: 50, section_id: 4, name: "Glue", category: "Consumption", unit: "KG" },
  { id: 51, section_id: 4, name: "Stitching Wire", category: "Consumption", unit: "KG" },
  { id: 52, section_id: 4, name: "Bundling Rope", category: "Consumption", unit: "KG" },
  { id: 53, section_id: 4, name: "Strapping Tape", category: "Consumption", unit: "nos" },
  { id: 54, section_id: 5, name: "Laminating Glue", category: "Consumption", unit: "KG" },
  { id: 55, section_id: 5, name: "Glue", category: "Consumption", unit: "KG" },
  { id: 56, section_id: 5, name: "Bundling Rope", category: "Consumption", unit: "KG" },
  { id: 57, section_id: 5, name: "Strapping Tape", category: "Consumption", unit: "nos" },
  { id: 58, section_id: 6, name: "Impression", category: "Output", unit: "nos" },
  { id: 59, section_id: 6, name: "Weight", category: "Output", unit: "KG" },
  { id: 60, section_id: 6, name: "No of Workers", category: "Consumption", unit: "count" },
  { id: 61, section_id: 6, name: "Weight/Worker", category: "Derived/Other", unit: "KG" },
  { id: 62, section_id: 6, name: "Hours Worked", category: "Consumption", unit: "hours" },
  { id: 63, section_id: 6, name: "Weight/Labour hour", category: "Derived/Other", unit: "KG" },
  { id: 64, section_id: 6, name: "Chemifix", category: "Consumption", unit: "KG" },
  { id: 65, section_id: 6, name: "Spray Chemifix", category: "Consumption", unit: "KG" },
  { id: 66, section_id: 6, name: "Stitching Wire", category: "Consumption", unit: "KG" },
  { id: 67, section_id: 6, name: "Bundling Rope", category: "Consumption", unit: "KG" },
  { id: 68, section_id: 7, name: "Electricity Usage", category: "Utilities", unit: "kWh" },
  { id: 69, section_id: 7, name: "Water - Main Meter", category: "Utilities", unit: "L" },
  { id: 70, section_id: 7, name: "Water - Cafeteria", category: "Utilities", unit: "L" },
  { id: 71, section_id: 7, name: "Water - Printer 04", category: "Utilities", unit: "L" },
  { id: 72, section_id: 8, name: "Wastewater Plant", category: "Utilities", unit: "L" },
  { id: 73, section_id: 8, name: "Waste %", category: "Consumption", unit: "%" }
];

// Filters
export const getSections = async () => SECTIONS;

export const getKPIs = async (params = {}) => {
    if (params.section_id) {
        return KPI_LIST.filter(k => k.section_id === parseInt(params.section_id));
    }
    return KPI_LIST;
}

// Standards
export const getStandards = async (params) => {
    const q = query(collection(db, 'standards'), where("section_id", "==", parseInt(params.section_id)));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id }));
}

export const upsertStandard = async (params) => {
    const stdId = `${params.section_id}_${params.kpi_id}`;
    const payload = {
        section_id: parseInt(params.section_id),
        kpi_id: parseInt(params.kpi_id),
        standard_value: parseFloat(params.standard_value),
        period_type: params.period_type,
        saved_at: new Date().toISOString()
    };
    await setDoc(doc(db, 'standards', stdId), payload);
    await setDoc(doc(db, 'standards_history', `${stdId}_${Date.now()}`), payload);
    return { status: "Success" };
}

export const getStandardHistory = async (params) => {
    const q = query(collection(db, 'standards_history'), where("section_id", "==", parseInt(params.section_id)), where("kpi_id", "==", parseInt(params.kpi_id)), orderBy("saved_at", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
}

export const deleteStandard = async (params) => {
    await deleteDoc(doc(db, 'standards', `${params.section_id}_${params.kpi_id}`));
    return { status: "Success" };
}

// Aggregations
export const getRecords = async (params) => {
    // 1. Get the true total number of days (documents) in the database
    const countSnap = await getCountFromServer(collection(db, 'daily_records'));
    const totalDocs = countSnap.data().count;

    // 2. Fetch the latest 50 days (documents) to save read bandwidth
    const q = query(collection(db, 'daily_records'), orderBy("date", "desc"), fbLimit(50));
    const snap = await getDocs(q);
    const results = [];
    snap.docs.forEach(d => {
        const item = d.data();
        Object.keys(item.metrics).forEach(kpiName => {
            results.push({
                date: item.date,
                section: item.section,
                kpi: kpiName,
                unit: item.metrics[kpiName].unit,
                value: item.metrics[kpiName].value,
                file: `Firebase Firestore`
            });
        });
    });
    
    // We estimate the total KPIs by multiplying documents by an average of 7 KPIs per section
    const estimatedTotalRecords = totalDocs * 7;
    
    return { data: results.slice(0, 100), total: estimatedTotalRecords };
}

let docsCache = { key: null, promise: null, time: 0 };

const getDocsForDateRange = async (start_date, end_date, section_id) => {
    const key = `${start_date}_${end_date}_${section_id}`;
    // Cache valid for 5 seconds to catch concurrent parallel requests from components
    if (docsCache.key === key && Date.now() - docsCache.time < 5000) {
        return await docsCache.promise;
    }

    const fetchPromise = (async () => {
        let q = query(collection(db, 'daily_records'), where("date", ">=", start_date), where("date", "<=", end_date));
        if (section_id && section_id !== '0') {
            const secName = SECTIONS.find(s => s.id === parseInt(section_id))?.name;
            if (secName) q = query(q, where("section", "==", secName));
        }
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data());
    })();
    
    docsCache = { key, promise: fetchPromise, time: Date.now() };
    return await fetchPromise;
}

const PERCENTAGE_UNITS = ['%', 'percent', 'pct'];
const isPct = (unit) => unit && PERCENTAGE_UNITS.includes(unit.toLowerCase());
const round2 = (num) => (num !== null && num !== undefined) ? Math.round(num * 100) / 100 : null;

export const getCategoryDailyMatrix = async (params) => {
    const docs = await getDocsForDateRange(params.start_date, params.end_date, '0');
    
    const datesSet = new Set();
    const seriesMap = {};
    
    if (params.section_id === '0') {
        return { dates: [], series: [] }; // Python returns empty for section 0
    } else {
        const kpis = await getKPIs({ section_id: params.section_id });
        const catMap = {};
        const unitMap = {};
        kpis.forEach(k => {
            catMap[k.name] = k.category;
            unitMap[k.name] = k.unit;
        });
        
        docs.forEach(d => {
            if (d.is_holiday) return;
            if (d.section !== SECTIONS.find(s => s.id === parseInt(params.section_id))?.name) return;
            datesSet.add(d.date);
            Object.keys(d.metrics).forEach(kpiName => {
                if (catMap[kpiName] === params.category || d.metrics[kpiName].category === params.category) {
                    if (d.metrics[kpiName].value > 0) {
                        if (!seriesMap[kpiName]) seriesMap[kpiName] = { unit: unitMap[kpiName], data: {} };
                        seriesMap[kpiName].data[d.date] = d.metrics[kpiName].value;
                    }
                }
            });
        });
    }
    
    const dates = Array.from(datesSet).sort();
    const series = Object.keys(seriesMap).map(kpiName => {
        return {
            kpi_id: KPI_LIST.find(k => k.name === kpiName)?.id || 0,
            kpi_name: kpiName,
            unit: seriesMap[kpiName].unit,
            values: dates.map(dt => {
                const val = seriesMap[kpiName].data[dt];
                return val ? round2(val) : null;
            })
        };
    });
    
    return { dates, series };
}

export const getCrossSectionSummary = async (params = {}) => {
    const docs = await getDocsForDateRange(params.start_date, params.end_date, '0');
    
    const secData = {};
    const kpis = await getKPIs();
    
    docs.forEach(d => {
        if (!secData[d.section]) secData[d.section] = { name: d.section, docs: [] };
        secData[d.section].docs.push(d);
    });

    const res = [];
    
    // Fetch all standards in parallel to drastically reduce network latency
    const sidsToFetch = Object.keys(secData).map(secName => SECTIONS.find(s => s.name === secName)?.id).filter(Boolean);
    const stdsPromises = sidsToFetch.map(sid => getStandards({ section_id: sid }).then(data => ({ sid, data })));
    const stdsResults = await Promise.all(stdsPromises);
    const stdsCache = {};
    stdsResults.forEach(r => stdsCache[r.sid] = r.data);

    for (const secName of Object.keys(secData)) {
        const sec = SECTIONS.find(s => s.name === secName);
        if (!sec) continue;
        const sid = sec.id;
        
        const stds = stdsCache[sid] || [];
        
        const sdocs = secData[secName].docs.filter(d => !d.is_holiday);
        const workingDays = sdocs.length;
        if (workingDays === 0) continue;

        let totalWeightKg = 0;
        sdocs.forEach(d => {
            Object.keys(d.metrics).forEach(k => {
                if ((k.toLowerCase() === 'weight' || k.toLowerCase() === 'total weight') && d.metrics[k].category === 'Output') {
                    totalWeightKg += d.metrics[k].value;
                }
            });
        });
        
        const outputMt = totalWeightKg / 1000;
        const totalWeightTons = outputMt > 0 ? outputMt : null;
        
        const consMap = {};
        sdocs.forEach(d => {
            Object.keys(d.metrics).forEach(k => {
                const kpiInfo = kpis.find(kpi => kpi.name === k);
                const cat = d.metrics[k].category || (kpiInfo ? kpiInfo.category : null);
                if (cat === 'Consumption') {
                    if (!consMap[k]) consMap[k] = { kpi_name: k, total: 0, unit: d.metrics[k].unit, kpi_id: kpiInfo?.id };
                    consMap[k].total += d.metrics[k].value;
                }
            });
        });
        
        const consumption = [];
        Object.values(consMap).forEach(c => {
            if (c.kpi_name.toLowerCase() === 'no of workers' || c.kpi_name.toLowerCase() === 'hours worked') return;
            
            const std = stds.find(s => s.kpi_id === c.kpi_id);
            let periodStd = null;
            let deviation = null;
            
            if (std) {
                if (std.period_type === 'ton' && totalWeightTons) {
                    periodStd = std.standard_value * totalWeightTons;
                } else if (std.period_type === 'day') {
                    periodStd = std.standard_value * workingDays;
                }
                if (periodStd && periodStd > 0) {
                    deviation = ((c.total - periodStd) / periodStd) * 100;
                }
            }
            
            consumption.push({
                kpi_id: c.kpi_id,
                kpi_name: c.kpi_name,
                unit: c.unit,
                total: round2(c.total),
                per_ton: totalWeightTons ? round2(c.total / totalWeightTons) : null,
                period_std: round2(periodStd),
                deviation: round2(deviation),
                std_period_type: std ? std.period_type : null
            });
        });
        
        res.push({
            section_id: sid,
            section_name: secName,
            output_mt: round2(outputMt),
            total_weight_kg: round2(totalWeightKg),
            working_days: workingDays,
            consumption
        });
    }
    
    return res;
}

export const getCategoryPerTon = async (params) => {
    if (params.section_id === '0') return [];
    const docs = await getDocsForDateRange(params.start_date, params.end_date, params.section_id);
    const kpis = await getKPIs({ section_id: params.section_id });
    
    const sdocs = docs.filter(d => !d.is_holiday);
    if (sdocs.length === 0) return [];

    let totalWeightKg = 0;
    sdocs.forEach(d => {
        Object.keys(d.metrics).forEach(k => {
            if ((k.toLowerCase() === 'weight' || k.toLowerCase() === 'total weight') && d.metrics[k].category === 'Output') {
                totalWeightKg += d.metrics[k].value;
            }
        });
    });
    
    const totalWeightTons = totalWeightKg / 1000;
    if (totalWeightTons === 0) return [];
    
    const stds = await getStandards({ section_id: params.section_id });
    const agg = {};
    
    sdocs.forEach(d => {
        Object.keys(d.metrics).forEach(kpiName => {
            const kpiInfo = kpis.find(k => k.name === kpiName);
            if (!kpiInfo || kpiInfo.category !== 'Consumption') return;
            if (kpiName.toLowerCase() === 'no of workers' || kpiName.toLowerCase() === 'hours worked') return;
            
            if (!agg[kpiName]) agg[kpiName] = { kpi_id: kpiInfo.id, kpi_name: kpiName, total: 0, unit: `${d.metrics[kpiName].unit}/Ton` };
            agg[kpiName].total += d.metrics[kpiName].value;
        });
    });
    
    const res = [];
    Object.values(agg).forEach(c => {
        const perTon = c.total / totalWeightTons;
        const std = stds.find(s => s.kpi_id === c.kpi_id && s.period_type === 'ton');
        let deviation = null;
        if (std && std.standard_value > 0) {
            deviation = ((perTon - std.standard_value) / std.standard_value) * 100;
        }
        res.push({
            kpi_id: c.kpi_id,
            kpi_name: c.kpi_name,
            value: round2(perTon),
            unit: c.unit,
            total_weight_tons: round2(totalWeightTons),
            aggregation: "per_ton",
            deviation: round2(deviation)
        });
    });
    
    return res;
}

export const getTrends = async (kpiId, params) => {
    const docs = await getDocsForDateRange(params.start_date, params.end_date, '0');
    
    let kpiNames = [];
    let factor = 1.0;
    let targetSection = null;
    
    if (kpiId < 0) {
        if (kpiId === -1) { kpiNames = ["Weight"]; factor = 0.001; targetSection = "Corrugator"; }
        else if (kpiId === -2) { kpiNames = ["Furnace Oil Consumed"]; }
        else if (kpiId === -3) { kpiNames = ["Glue", "Laminating Glue"]; }
    } else {
        const kpiInfo = KPI_LIST.find(k => k.id === parseInt(kpiId));
        if (kpiInfo) kpiNames = [kpiInfo.name];
        if (params.section_id && params.section_id !== '0') {
            targetSection = SECTIONS.find(s => s.id === parseInt(params.section_id))?.name;
        }
    }
    
    const totalsByDate = {};
    docs.forEach(d => {
        if (d.is_holiday) return;
        if (targetSection && d.section !== targetSection) return;
        
        let dailySum = 0;
        kpiNames.forEach(name => {
            if (d.metrics[name]) {
                dailySum += d.metrics[name].value;
            }
        });
        
        if (dailySum > 0) {
            totalsByDate[d.date] = (totalsByDate[d.date] || 0) + (dailySum * factor);
        }
    });
    
    const sortedDates = Object.keys(totalsByDate).sort();
    return sortedDates.map(d => ({
        date: d,
        total: totalsByDate[d] // the python trend logic does not round the raw trend arrays
    }));
}

export const getSummary = async (params) => {
    return { 
      total_output: 0, output_change: 0, 
      total_consumption: 0, consumption_change: 0,
      total_utilities: 0, utilities_change: 0
    };
}

export const getUtilities = async (params = {}) => {
    const docs = await getDocsForDateRange(params.start_date, params.end_date, '0');
    const agg = {};
    docs.forEach(d => {
        // Utilities section: Electricity + Water meters
        // Waste section: Wastewater Plant
        if (d.section === 'Utilities' || d.section === 'Waste') {
            Object.keys(d.metrics).forEach(kpi => {
                const kpiInfo = KPI_LIST.find(k => k.name === kpi);
                // Only aggregate items classified as Utilities category
                if (!kpiInfo || kpiInfo.category !== 'Utilities') return;
                if (!agg[kpi]) agg[kpi] = { kpi_name: kpi, value: 0, unit: d.metrics[kpi].unit, kpi_id: kpiInfo.id };
                agg[kpi].value += d.metrics[kpi].value;
            });
        }
    });
    return Object.values(agg).map(c => ({...c, value: round2(c.value), aggregation: "sum"}));
}

export const getCategorySummary = async (params) => {
    const docs = await getDocsForDateRange(params.start_date, params.end_date, '0');
    
    if (params.section_id === '0') {
        let corr_kg = 0;
        let fo_l = 0;
        let glue_kg = 0;
        let waste_pct_sum = 0;
        let waste_pct_count = 0;
        let corr_wdSet = new Set();
        let factory_wdSet = new Set();
        
        docs.forEach(d => {
            if (d.is_holiday) return;
            
            let dailyTotalWeight = 0;
            Object.keys(d.metrics).forEach(k => {
                if ((k.toLowerCase() === 'weight' || k.toLowerCase() === 'total weight') && d.metrics[k].category === 'Output') {
                    dailyTotalWeight += d.metrics[k].value;
                }
            });
            if (dailyTotalWeight > 0) factory_wdSet.add(d.date);
            
            if (d.section === 'Corrugator') {
                const wt = d.metrics['Weight']?.value || 0;
                if (wt > 0) corr_wdSet.add(d.date);
                corr_kg += wt;
            }
            fo_l += d.metrics['Furnace Oil Consumed']?.value || 0;
            glue_kg += (d.metrics['Glue']?.value || 0) + (d.metrics['Laminating Glue']?.value || 0);
            
            if (d.metrics['Waste %']) {
                waste_pct_sum += d.metrics['Waste %'].value;
                waste_pct_count += 1;
            }
        });
        
        const waste_val = waste_pct_count > 0 ? (waste_pct_sum / waste_pct_count) : null;
        
        return [
            { kpi_id: -1, kpi_name: "Corrugator MT", unit: "MT", value: round2(corr_kg / 1000), aggregation: "sum", working_days: corr_wdSet.size, total_weight_kg: corr_kg },
            { kpi_id: -2, kpi_name: "Furnace Oil", unit: "Liters", value: round2(fo_l), aggregation: "sum", working_days: corr_wdSet.size, total_weight_kg: corr_kg },
            { kpi_id: -3, kpi_name: "Glue", unit: "KG", value: round2(glue_kg), aggregation: "sum", working_days: null, total_weight_kg: corr_kg, pre_computed_period_std: null }, // we can leave pre_computed null for now
            { kpi_id: -4, kpi_name: "Waste %", unit: "%", value: round2(waste_val), aggregation: "avg", working_days: factory_wdSet.size, total_weight_kg: corr_kg },
        ];
    }
    
    const kpis = await getKPIs({ section_id: params.section_id });
    const catMap = {};
    const unitMap = {};
    kpis.forEach(k => { catMap[k.name] = k.category; unitMap[k.name] = k.unit; });
    
    const agg = {};
    const targetSectionName = SECTIONS.find(s => s.id === parseInt(params.section_id))?.name;
    
    let total_weight_kg = 0;
    let wdSet = new Set();
    
    docs.forEach(d => {
        if (d.is_holiday) return;
        if (d.section !== targetSectionName) return;
        
        let dailyTotalWeight = 0;
        Object.keys(d.metrics).forEach(k => {
            if ((k.toLowerCase() === 'weight' || k.toLowerCase() === 'total weight') && d.metrics[k].category === 'Output') {
                dailyTotalWeight += d.metrics[k].value;
            }
        });
        if (dailyTotalWeight > 0) wdSet.add(d.date);
        total_weight_kg += dailyTotalWeight;
        
        Object.keys(d.metrics).forEach(kpiName => {
            const cat = catMap[kpiName] || d.metrics[kpiName].category;
            if (cat === params.category) {
                if (!agg[kpiName]) agg[kpiName] = { kpi_name: kpiName, value: 0, unit: d.metrics[kpiName].unit || unitMap[kpiName], kpi_id: KPI_LIST.find(k=>k.name===kpiName)?.id };
                agg[kpiName].value += d.metrics[kpiName].value;
            }
        });
    });
    
    const working_days = wdSet.size;
    
    return Object.values(agg).map(c => {
        const isPercentage = isPct(c.unit);
        let finalValue = c.value;
        if (isPercentage && working_days > 0) {
            finalValue = finalValue / working_days;
        }
        return {
            ...c,
            value: round2(finalValue),
            aggregation: isPercentage ? "avg_working_days" : "sum",
            working_days,
            total_weight_kg
        };
    });
}
