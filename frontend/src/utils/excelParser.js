import * as XLSX from 'xlsx';
import { db } from '../firebase';
import { collection, writeBatch, doc, getDocs, deleteDoc, query, where } from 'firebase/firestore';

const KPI_MAP = [
  ["Sales", "Orders Brought In", 1, "KG"],
  ["Corrugator", "Weight", 2, "KG"],
  ["Corrugator", "Linear Meters", 3, "LMTS"],
  ["Corrugator", "Square Meters", 4, "SQM"],
  ["Corrugator", "Weight Efficiency", 5, "%"],
  ["Corrugator", "Capacity Utilisation", 6, "%"],
  ["Corrugator", "No of Workers", 7, "count"],
  ["Corrugator", "Weight/Worker", 8, "KG"],
  ["Corrugator", "Hours Worked", 9, "hours"],
  ["Corrugator", "Weight/Labour Hour", 10, "KG"],
  ["Corrugator", "Furnace Oil Consumed", 11, "Liters"],
  ["Corrugator", "Furnace Oil/Ton", 12, "Liters/Ton"],
  ["Corrugator", "Corn Starch", 13, "KG"],
  ["Corrugator", "Starch", 14, "KG"],
  ["Corrugator", "Starch / Ton", 15, "KG/Ton"],
  ["Corrugator", "Caustic Soda", 16, "KG"],
  ["Corrugator", "Caustic Soda / Ton", 17, "KG/Ton"],
  ["Corrugator", "Borax", 18, "KG"],
  ["Corrugator", "Borax / Ton", 19, "KG/Ton"],
  
  ["Flexo", "P1 & P6 Qty", 20, "pcs"],
  ["Flexo", "P1 & P6 Weight", 21, "KG"],
  ["Flexo", "P4 Qty", 22, "pcs"],
  ["Flexo", "P4 Weight", 23, "KG"],
  ["Flexo", "Total Qty", 24, "pcs"],
  ["Flexo", "Total Weight", 25, "KG"],
  ["Flexo", "Efficiency", 26, "%"],
  ["Flexo", "Utilisation", 27, "%"],
  ["Flexo", "No of Workers", 28, "count"],
  ["Flexo", "Weight/Worker", 29, "KG"],
  ["Flexo", "Hours Worked", 30, "hours"],
  ["Flexo", "Weight/Labour Hour", 31, "KG"],
  ["Flexo", "Ink", 32, "KG"],
  ["Flexo", "Ink / Ton", 33, "KG/Ton"],
  ["Flexo", "Glue", 34, "KG"],
  ["Flexo", "Bundling Rope", 35, "KG"],
  
  ["Finishing B", "Impression", 39, "nos"],
  ["Finishing B", "Weight", 40, "KG"],
  
  ["Finishing A", "Finished Qty", 42, "pcs"],
  ["Finishing A", "Weight", 43, "KG"],
  ["Finishing A", "Efficiency", 44, "%"],
  ["Finishing A", "Combined Efficiency", 45, "%"],
  ["Finishing A", "No of Workers", 46, "count"],
  ["Finishing A", "Weight/Worker", 47, "KG"],
  ["Finishing A", "Hours Worked", 48, "hours"],
  ["Finishing A", "Weight/Labour hour", 49, "KG"],
  
  ["Finishing A", "Glue", 50, "KG"], 
  ["Finishing A", "Stitching Wire", 51, "KG"],
  ["Finishing A", "Bundling Rope", 52, "KG"],
  ["Finishing A", "Strapping Tape", 53, "nos"],
  
  ["Finishing B", "Laminating Glue", 54, "KG"], 
  ["Finishing B", "Glue", 55, "KG"],
  ["Finishing B", "Bundling Rope", 56, "KG"],
  ["Finishing B", "Strapping Tape", 57, "nos"],
  
  ["Factory 2", "Impression", 58, "nos"],
  ["Factory 2", "Weight", 59, "KG"],
  ["Factory 2", "No of Workers", 60, "count"],
  ["Factory 2", "Weight/Worker", 61, "KG"],
  ["Factory 2", "Hours Worked", 62, "hours"],
  ["Factory 2", "Weight/Labour hour", 63, "KG"],
  ["Factory 2", "Chemifix", 64, "KG"],
  ["Factory 2", "Spray Chemifix", 65, "KG"],
  ["Factory 2", "Stitching Wire", 66, "KG"],
  ["Factory 2", "Bundling Rope", 67, "KG"],

  ["Utilities", "Electricity Usage",  68, "kWh"],
  ["Utilities", "Water - Main Meter", 69, "L"],
  ["Utilities", "Water - Cafeteria",  70, "L"],
  ["Utilities", "Water - Printer 04", 71, "L"],
  ["Waste",     "Wastewater Plant",   72, "L"]
];

const WORKING_DAYS_CELLS = {
  "Corrugator":   { row: 41, col: 3 },
  "Flexo":        { row: 41, col: 20 },
  "Finishing B":  { row: 41, col: 39 },
  "Finishing A":  { row: 41, col: 42 },
  "Factory 2":    { row: 1,  col: 58 }
};

function classifyKpi(name) {
  const n = name.toLowerCase();
  if (n === "orders brought in") return "Orders";
  if (n === "wastewater plant") return "Utilities"; // category stays Utilities even though section is Waste
  const utilities = ["electricity usage", "water - main meter", "water - cafeteria", "water - printer 04"];
  if (utilities.includes(n)) return "Utilities";
  const consumptions = ["no of workers", "hours worked", "furnace oil consumed", "corn starch", "caustic soda", "borax", "ink", "glue", "bundling rope", "stitching wire", "strapping tape", "laminating glue", "chemifix", "spray chemifix"];
  if (consumptions.includes(n)) return "Consumption";
  const outputs = ["weight", "linear meters", "square meters", "weight efficiency", "efficiency", "capacity utilisation", "utilisation", "combined efficiency", "impression", "p1 & p6 qty", "p1 & p6 weight", "p4 qty", "p4 weight", "total qty", "total weight", "finished qty"];
  if (outputs.includes(n)) return "Output";
  return "Derived/Other";
}

const safeFloat = (val) => {
  if (val === undefined || val === null || String(val).trim() === '' || String(val).trim() === '-') return 0.0;
  const num = parseFloat(val);
  return isNaN(num) ? 0.0 : num;
};

// Excel stores dates as serial numbers sometimes
function excelDateToJSDate(serial) {
  if (typeof serial === 'string') {
    const d = new Date(serial);
    if (!isNaN(d.getTime())) return d;
  }
  if (typeof serial !== 'number') return null;
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  return new Date(utc_value * 1000);
}

export const processExcelFile = async (file, onProgress) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        let totalRecordsProcessed = 0;
        
        const isWasteFile = file.name.toLowerCase().includes('waste');

        if (isWasteFile) {
          let fileMonth = null;
          let fileYear = null;
          const mFile = file.name.match(/(\d{2})\.(\d{4})/);
          if (mFile) {
            fileMonth = parseInt(mFile[1], 10);
            fileYear = parseInt(mFile[2], 10);
          }

          let currentBatch = writeBatch(db);
          let opCount = 0;
          const batches = [];

          for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
            
            let sheetMonth = fileMonth;
            let sheetYear = fileYear;

            if (!sheetYear) {
              const mSheet = sheetName.match(/\d{2}\.(\d{2})\.(\d{4})/);
              if (mSheet) {
                sheetMonth = parseInt(mSheet[1], 10);
                sheetYear = parseInt(mSheet[2], 10);
              }
            }

            if (!sheetYear || rawData.length < 4) continue;
            
            onProgress && onProgress(`Processing Waste Data in ${sheetName}...`);

            for (let rowIdx = 3; rowIdx < rawData.length; rowIdx++) {
              const row = rawData[rowIdx];
              if (row.length < 26) continue;
              
              const dateRaw = row[0];
              const day = parseInt(dateRaw, 10);
              if (isNaN(day) || day < 1 || day > 31) continue;

              const valRaw = row[25];
              if (valRaw === null || valRaw === undefined) continue;

              let val = parseFloat(String(valRaw).replace('%', '').trim());
              if (isNaN(val) || val <= 0) continue;

              if (val > 0 && val < 1.0 && String(valRaw).indexOf('%') === -1) {
                  val = val * 100;
              }

              const dateStr = `${sheetYear}-${String(sheetMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const docId = `${dateStr}_Waste`;
              const docRef = doc(collection(db, 'daily_records'), docId);
              
              const payload = {
                date: dateStr,
                year: sheetYear,
                month: sheetMonth,
                day: day,
                section: 'Waste',
                is_holiday: false,
                metrics: {
                    'Waste %': { value: val, unit: '%', category: 'Consumption', capacity: null }
                }
              };
              
              currentBatch.set(docRef, payload, { merge: true });
              opCount++;
              totalRecordsProcessed++;
              
              if (opCount >= 450) {
                batches.push(currentBatch);
                currentBatch = writeBatch(db);
                opCount = 0;
              }
            }
          }
          
          if (opCount > 0) batches.push(currentBatch);
          for (let b of batches) {
            await b.commit();
          }
          
          resolve({ recordsProcessed: totalRecordsProcessed, status: 'Success' });
          return;
        }

        // --- standard production file processing below ---
        
        // Month names mapping
        const monthMap = { "JANUARY":1,"FEBRUARY":2,"MARCH":3,"APRIL":4, "MAY":5,"JUNE":6,"JULY":7,"AUGUST":8, "SEPTEMBER":9,"OCTOBER":10,"NOVEMBER":11,"DECEMBER":12 };

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
          
          if (rawData.length < 8) continue; // Too small

          let sheetMonth = null;
          let sheetYear = null;
          
          const match = sheetName.toUpperCase().match(/([A-Z]+)[^\d]*(\d{4})/);
          if (match) {
            sheetMonth = monthMap[match[1]];
            sheetYear = parseInt(match[2]);
          }

          if (!sheetMonth || !sheetYear) continue;

          onProgress && onProgress(`Processing ${sheetName}...`);

          // Working Days
          const workingDays = {};
          for (const [secName, cell] of Object.entries(WORKING_DAYS_CELLS)) {
            const { row, col } = cell;
            if (row < rawData.length && col < rawData[row].length) {
              const wdVal = safeFloat(rawData[row][col]);
              if (wdVal > 0) workingDays[secName] = wdVal;
            }
          }

          // Capacities (row 7)
          const row6Cap = rawData[6] || [];
          const capacities = {};
          KPI_MAP.forEach(([sec, kpi, colIdx]) => {
            if (colIdx < row6Cap.length) {
              const cap = safeFloat(row6Cap[colIdx]);
              if (cap > 0) capacities[`${sec}_${kpi}`] = cap;
            }
          });

          // Delete existing records for this month to replace them
          const q = query(collection(db, 'daily_records'), where("month", "==", sheetMonth), where("year", "==", sheetYear));
          const snapshot = await getDocs(q);
          const batches = [];
          let currentBatch = writeBatch(db);
          let opCount = 0;
          
          snapshot.docs.forEach(doc => {
            currentBatch.delete(doc.ref);
            opCount++;
            if (opCount === 450) {
              batches.push(currentBatch);
              currentBatch = writeBatch(db);
              opCount = 0;
            }
          });

          // Process rows (row 8 onwards)
          for (let rowIdx = 7; rowIdx < rawData.length; rowIdx++) {
            const row = rawData[rowIdx];
            const rawDate = row[0];
            if (!rawDate) continue;

            const dateVal = excelDateToJSDate(rawDate);
            if (!dateVal) continue;
            
            // Format date as YYYY-MM-DD
            const dateStr = `${dateVal.getFullYear()}-${String(dateVal.getMonth()+1).padStart(2, '0')}-${String(dateVal.getDate()).padStart(2, '0')}`;

            const cWeight = row.length > 2 ? safeFloat(row[2]) : 0;
            const fWeight = row.length > 25 ? safeFloat(row[25]) : 0;
            const isHoliday = (cWeight === 0 && fWeight === 0);

            // Group by section for Firestore documents
            const sectionData = {};
            
            KPI_MAP.forEach(([sec, kpi, colIdx, unit]) => {
              if (!sectionData[sec]) sectionData[sec] = { metrics: {} };
              if (colIdx < row.length) {
                let val = safeFloat(row[colIdx]);
                if (unit === "%" && val <= 5.0 && val > 0) val = val * 100;
                
                if (val > 0) { // Only save non-zero metrics to save space
                  sectionData[sec].metrics[kpi] = {
                    value: val,
                    unit,
                    category: classifyKpi(kpi),
                    capacity: capacities[`${sec}_${kpi}`] || null
                  };
                  totalRecordsProcessed++;
                }
              }
            });

            // Write documents
            Object.keys(sectionData).forEach(sec => {
              if (Object.keys(sectionData[sec].metrics).length === 0) return; // Skip empty
              
              const docId = `${dateStr}_${sec.replace(/\s+/g, '_')}`;
              const docRef = doc(collection(db, 'daily_records'), docId);
              
              const payload = {
                date: dateStr,
                year: sheetYear,
                month: sheetMonth,
                day: dateVal.getDate(),
                section: sec,
                is_holiday: isHoliday,
                working_days: workingDays[sec] || null,
                metrics: sectionData[sec].metrics
              };
              
              currentBatch.set(docRef, payload);
              opCount++;
              
              if (opCount >= 450) {
                batches.push(currentBatch);
                currentBatch = writeBatch(db);
                opCount = 0;
              }
            });
          }
          
          if (opCount > 0) batches.push(currentBatch);
          
          for (let b of batches) {
            await b.commit();
          }
        }

        resolve({ recordsProcessed: totalRecordsProcessed, status: 'Success' });
      } catch (err) {
        console.error(err);
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};
