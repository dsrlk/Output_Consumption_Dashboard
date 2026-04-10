import React, { useState, useEffect } from 'react';
import { getSections, getCategoryDailyMatrix, getCategoryPerTon, getCrossSectionSummary } from '../services/api';
import { Filter, Zap, Info, Trophy, AlertTriangle, TrendingDown, Target, Building } from 'lucide-react';
import { useFilters } from '../context/FilterContext';
import CustomSelect from '../components/CustomSelect';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Cell, Legend, ReferenceLine } from 'recharts';
import { BlurText } from '../components/animations/BlurText';
import SpotlightCard from '../components/animations/SpotlightCard';
import CountUp from '../components/animations/CountUp';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (v, dp = 1) => v == null ? '—' : v.toLocaleString(undefined, { maximumFractionDigits: dp });
const EXCLUDE = new Set(['no of workers', 'hours worked']);

const hexToRgb = hex => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
};
const lerpColor = (hex1, hex2, t) => {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
};

const outputColor = t => lerpColor('#ffffff', '#09090b', Math.max(0, t));
const consumColor = t => lerpColor('#ffffff', '#e62020', Math.max(0, t));

// ── Heatmap Components ────────────────────────────────────────────────────────
const Tooltip = ({ cell, pos }) => {
  if (!cell) return null;
  return (
    <div style={{
      position: 'fixed', left: pos.x + 14, top: pos.y - 10,
      background: 'var(--card-bg)', border: '1px solid var(--border-color)',
      borderRadius: '10px', padding: '0.65rem 0.9rem',
      boxShadow: 'var(--shadow-md)',
      zIndex: 9999, pointerEvents: 'none', minWidth: '160px',
      fontSize: '0.8rem',
    }}>
      <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--text-main)' }}>{cell.date}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{cell.kpi}</div>
      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: cell.isOutput ? 'var(--text-main)' : 'var(--danger)' }}>
        {cell.value != null ? `${fmt(cell.value, cell.isOutput ? 2 : 1)} ${cell.unit}` : 'No data'}
      </div>
      {cell.value != null && (
        <div style={{ marginTop: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {`${fmt(cell.pct * 100, 0)}% of period peak`}
        </div>
      )}
    </div>
  );
};

const Heatmap = ({ rows, dates }) => {
  const [hover, setHover] = useState(null);
  const [pos,   setPos]   = useState({ x: 0, y: 0 });

  if (!rows.length || !dates.length) return null;

  const CELL_W   = 42;
  const CELL_H   = 38;
  const ROW_LABEL_W = 140;
  const HEADER_H    = 40;

  return (
    <div style={{ overflowX: 'auto', overflowY: 'visible', position: 'relative', width: '100%', paddingBottom: '0.5rem' }}>
      <Tooltip cell={hover} pos={pos} />
      
      {/* Date Headers */}
      <div style={{ display: 'flex', marginBottom: '2px', minWidth: 'min-content' }}>
        <div style={{ 
          width: ROW_LABEL_W, minWidth: ROW_LABEL_W, flexShrink: 0, 
          position: 'sticky', left: 0, background: 'var(--card-bg)', zIndex: 4, 
          borderRight: '1px solid var(--border-color)', boxShadow: '4px 0 16px rgba(0,0,0,0.04)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', paddingBottom: '6px', paddingLeft: '8px'
        }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Materials / KPI
          </span>
        </div>
        {dates.map(d => (
          <div key={d} style={{
            width: CELL_W, minWidth: CELL_W, height: HEADER_H, margin: '0 1px',
            fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '4px',
            flexShrink: 0, userSelect: 'none',
          }}>
            <span style={{ transform: 'rotate(-40deg)', transformOrigin: 'bottom center', paddingBottom: '5px' }}>{d.slice(5)}</span>
          </div>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row, ri) => {
        const vals = row.values;
        const nonNull = vals.filter(v => v != null && v > 0);
        const minV = nonNull.length ? Math.min(...nonNull) : 0;
        const maxV = nonNull.length ? Math.max(...nonNull) : 1;
        const range = maxV - minV || 1;
        const isOutput = row.isOutput;
        const sep = ri === 0 && rows.length > 1;

        return (
          <div key={row.kpi} style={{ display: 'flex', alignItems: 'center', marginBottom: '2px', minWidth: 'min-content', borderTop: sep ? '2px solid var(--border-color)' : undefined, paddingTop: sep ? '6px' : undefined }}>
            <div style={{
              width: ROW_LABEL_W, minWidth: ROW_LABEL_W, paddingLeft: '8px', paddingRight: '10px',
              height: CELL_H + 'px', alignSelf: 'stretch',
              fontSize: '0.72rem', fontWeight: isOutput ? 700 : 500,
              color: isOutput ? 'var(--text-main)' : 'var(--text-muted)',
              textAlign: 'left', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px',
              position: 'sticky', left: 0, background: 'var(--card-bg)', zIndex: 2,
              borderRight: '1px solid var(--border-color)',
              boxShadow: '4px 0 16px rgba(0,0,0,0.06)'
            }}>
              {isOutput && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-main)', display: 'inline-block', flexShrink: 0 }} />}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.kpi} {row.unit ? <span style={{opacity: 0.7}}>{`(${row.unit})`}</span> : ''}
              </span>
            </div>
            
            {vals.map((v, ci) => {
              const hasData = v != null && v > 0;
              const t = hasData ? (v - minV) / range : 0;
              const bg = !hasData ? 'var(--border-color)' : isOutput ? outputColor(t) : consumColor(t);
              const textColor = t > 0.55 ? '#fff' : 'var(--text-muted)';
              
              return (
                <div
                  key={ci}
                  style={{
                    width: CELL_W, minWidth: CELL_W, height: CELL_H, background: bg,
                    borderRadius: '4px', margin: '0 1px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0,
                    transition: 'transform 0.1s, box-shadow 0.1s',
                    fontSize: '0.62rem', color: textColor, fontWeight: 700, boxSizing: 'border-box'
                  }}
                  onMouseEnter={e => { setPos({ x: e.clientX, y: e.clientY }); setHover({ date: dates[ci], kpi: row.kpi, value: v, unit: row.unit, isOutput, pct: t }); }}
                  onMouseMove={e => setPos({ x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setHover(null)}
                >
                  {hasData ? (isOutput ? fmt(v, 0) : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : fmt(v, 0)) : null}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

// ── Overall Cross-Section View ────────────────────────────────────────────────
const OverallView = ({ data, loading }) => {
  if (loading) return (
    <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
      <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block', marginRight: '10px', animation: 'pulse 1.5s infinite' }} />
      Computing cross-sectional analytics...
    </div>
  );

  if (!data || data.length === 0) return (
    <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
      No cross-sectional data available for this period.
    </div>
  );

  // Score departments based on their average benchmark deviations
  const rankedDepts = data.map(dept => {
    let devSum = 0;
    let devCount = 0;
    let anomalies = 0;
    dept.consumption.forEach(c => {
      if (c.deviation !== null) {
        devSum += c.deviation;
        devCount++;
        if (c.deviation > 5) anomalies++;
      }
    });
    const avgDev = devCount > 0 ? (devSum / devCount) : null;
    return { ...dept, avgDev, devCount, anomalies };
  }).sort((a, b) => {
    if (a.avgDev === null && b.avgDev === null) return b.output_mt - a.output_mt;
    if (a.avgDev === null) return 1;
    if (b.avgDev === null) return -1;
    return a.avgDev - b.avgDev; // Lower deviation is better (negative = under consumption)
  });

  const chartData = rankedDepts.map(d => ({
    name: d.section_name,
    output: Math.round(d.output_mt),
    variance: d.avgDev !== null ? Number(d.avgDev.toFixed(1)) : null
  })).filter(d => d.output > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Banner KPI / Leaderboard Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* Leader */}
        {rankedDepts[0]?.avgDev !== null && (
          <SpotlightCard className="dribbble-card" style={{ flex: 1 }} spotlightColor="rgba(15, 23, 42, 0.08)">
            <div className="dribbble-header">
              <span className="dribbble-title" style={{ color: 'var(--success)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trophy size={18} /> Most Efficient Department
              </span>
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.03em', marginBottom: '0.2rem' }}>
              {rankedDepts[0].section_name}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingDown size={16} color="var(--success)"/> Operating {Math.abs(fmt(rankedDepts[0].avgDev, 1))}% below allowed consumption limits
            </div>
          </SpotlightCard>
        )}

        {/* Highest output */}
        <SpotlightCard className="dribbble-card">
          <div className="dribbble-header">
            <span className="dribbble-title" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building size={16} /> Highest Production Volume
            </span>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.03em', marginBottom: '0.2rem' }}>
            {chartData.sort((a,b)=>b.output - a.output)[0]?.name || 'N/A'}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <CountUp to={chartData.sort((a,b)=>b.output - a.output)[0]?.output || 0} duration={0.8} /> MT Total Output
          </div>
        </SpotlightCard>
      </div>

      {/* Main content grid */}
      <div className="analytics-grid-two-col">
        
        {/* Output vs Consumption Chart */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', marginBottom: 0 }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 className="card-title" style={{ margin: 0 }}>Volume vs Consumption Variance</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>Bar = Output (MT). Line = Avg Consumption Variance (%)</p>
          </div>
          <div style={{ flex: 1, minHeight: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }} dy={10} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickFormatter={(val) => `${val}%`} />
                <RechartsTooltip cursor={{ fill: 'rgba(9,9,11,0.03)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)', fontWeight: 600 }} />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }} />
                <ReferenceLine yAxisId="right" y={0} stroke="var(--success)" strokeDasharray="4 4" opacity={0.5} />
                <Bar yAxisId="left" dataKey="output" name="Output (MT)" radius={[6, 6, 0, 0]} maxBarSize={50} fill="var(--text-main)" />
                <Line yAxisId="right" connectNulls={false} type="monotone" dataKey="variance" name="Consumption Variance (%)" stroke="var(--danger)" strokeWidth={3} dot={{ r: 5, strokeWidth: 2, fill: 'var(--card-bg)' }} activeDot={{ r: 8 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Scorecard Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
          <div style={{ padding: '1.5rem 1.5rem 1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <h3 className="card-title" style={{ margin: 0 }}>Department Scorecard</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Ranked based on average variance against defined systemic benchmarks.</p>
          </div>
          <div className="table-container" style={{ borderRadius: 0, border: 'none', boxShadow: 'none', flex: 1 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ paddingLeft: '1.5rem' }}>Department</th>
                  <th>Output</th>
                  <th>Efficiency Score</th>
                  <th style={{ paddingRight: '1.5rem', textAlign: 'right' }}>Anomalies</th>
                </tr>
              </thead>
              <tbody>
                {rankedDepts.map((d, i) => (
                  <tr key={d.section_id}>
                    <td style={{ paddingLeft: '1.5rem', fontWeight: 700 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-outer)', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>{i + 1}</span>
                        {d.section_name}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>{fmt(d.output_mt, 0)} MT</td>
                    <td>
                      {d.avgDev !== null ? (
                        <span className={`badge ${d.avgDev <= 0 ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                          {d.avgDev <= 0 ? 'Optimal' : 'Over-consuming'} ({fmt(d.avgDev, 1)}%)
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'var(--bg-outer)', color: 'var(--text-muted)' }}>No Standards</span>
                      )}
                    </td>
                    <td style={{ paddingRight: '1.5rem', textAlign: 'right' }}>
                      {d.anomalies > 0 ? (
                        <span style={{ color: 'var(--danger)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', fontSize: '0.8rem' }}>
                          <AlertTriangle size={14} /> {d.anomalies}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.8rem' }}>0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const Analytics = () => {
  const { startDate, setStartDate, endDate, setEndDate } = useFilters();

  const [sectionsList, setSectionsList] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  
  // States for Heatmap view
  const [outputMatrix, setOutputMatrix] = useState({ dates: [], series: [] });
  const [consumMatrix, setConsumMatrix] = useState({ dates: [], series: [] });
  const [perTonData,   setPerTonData]   = useState([]);
  
  // State for Overall view
  const [crossSummary, setCrossSummary] = useState([]);
  const [loading,      setLoading]      = useState(false);

  // Load sections and unshift "overall"
  useEffect(() => {
    let cancelled = false;
    getSections().then(d => {
      if (cancelled) return;
      // Exclude generic '0' and drop pure sales sections
      const list = d.filter(s => s.id !== 0 && !s.name.toLowerCase().includes('sales'));
      const options = [{ id: 'overall', name: 'Overall Factory View' }, ...list];
      setSectionsList(options);
      if (options.length) setSelectedDept('overall');
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Clear stale data immediately when department changes so old data never shows
  useEffect(() => {
    if (!selectedDept) return;
    // Reset everything upfront so there's no flash of stale content
    setCrossSummary([]);
    setOutputMatrix({ dates: [], series: [] });
    setConsumMatrix({ dates: [], series: [] });
    setPerTonData([]);
    setLoading(true);

    let cancelled = false;
    const baseArgs = {};
    if (startDate) baseArgs.start_date = startDate;
    if (endDate)   baseArgs.end_date   = endDate;

    const fetchData = async () => {
      try {
        if (selectedDept === 'overall') {
          const summary = await getCrossSectionSummary(baseArgs);
          if (!cancelled) setCrossSummary(summary);
        } else {
          baseArgs.section_id = selectedDept;
          const [oMat, cMat, pTon] = await Promise.all([
            getCategoryDailyMatrix({ ...baseArgs, category: 'Output' }),
            getCategoryDailyMatrix({ ...baseArgs, category: 'Consumption' }),
            getCategoryPerTon(baseArgs),
          ]);
          if (!cancelled) {
            setOutputMatrix(oMat);
            setConsumMatrix(cMat);
            setPerTonData(pTon);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    // Cleanup: if department changes mid-flight, discard the old response
    return () => { cancelled = true; };
  }, [selectedDept, startDate, endDate]);

  // Derived calculations for Heatmap mode
  const allDates = [...new Set([...outputMatrix.dates, ...consumMatrix.dates])].sort();
  const weightSeries = outputMatrix.series.find(s => ['weight', 'total weight'].includes(s.kpi_name?.toLowerCase()));
  const heatmapRows = [];

  if (weightSeries) {
    heatmapRows.push({
      kpi: 'Output', unit: 'MT', isOutput: true,
      values: allDates.map(d => {
        const i = outputMatrix.dates.indexOf(d);
        const kg = i >= 0 ? weightSeries.values[i] : null;
        return kg != null && kg > 0 ? Math.round(kg / 10) / 100 : null;
      }),
    });
  }

  consumMatrix.series
    .filter(s => !EXCLUDE.has(s.kpi_name?.toLowerCase()) && s.values.some(v => v > 0))
    .forEach(s => {
      heatmapRows.push({
        kpi: s.kpi_name, unit: s.unit, isOutput: false,
        values: allDates.map(d => {
          const i = consumMatrix.dates.indexOf(d);
          return i >= 0 ? (s.values[i] ?? null) : null;
        }),
      });
    });

  const efficiencyKpis = perTonData.filter(k => !EXCLUDE.has(k.kpi_name?.toLowerCase()));
  const selectedDeptName = sectionsList.find(s => String(s.id) === selectedDept)?.name ?? '';

  // UI rendering switch
  const isOverall = selectedDept === 'overall';

  // Empty state fix for comfort
  const renderEmptyState = (msg) => (
    <div style={{ height: '260px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
      <div style={{ background: 'var(--bg-outer)', padding: '16px', borderRadius: '50%', marginBottom: '16px' }}>
        <Target size={32} opacity={0.5} />
      </div>
      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>No Data Available</div>
      <div style={{ fontSize: '0.85rem', marginTop: '6px' }}>{msg}</div>
    </div>
  );

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <BlurText className="page-title" text="Analytics" />
      </div>

      {/* Filters Bar — matches Dashboard layout */}
      <div className="filters-bar">
        <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.95rem', paddingBottom: '0.65rem' }}>
          <Filter size={18} style={{ marginRight: '8px', color: 'var(--text-muted)' }} /> Filters
        </div>

        {/* View / Department */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>View</span>
          <CustomSelect
            value={String(selectedDept)}
            onChange={val => setSelectedDept(val)}
            options={sectionsList.map(s => ({ value: String(s.id), label: s.name }))}
            style={{ width: '200px' }}
          />
        </div>

        {/* From Date */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From Date</span>
          <input type="date" className="date-input"
            value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>

        {/* To Date */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>To Date</span>
          <input type="date" className="date-input"
            value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>

        {loading && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)', paddingBottom: '0.65rem' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block', animation: 'pulse 1.2s infinite' }} />
            Syncing...
          </span>
        )}
      </div>


      {isOverall ? (
        <OverallView data={crossSummary} loading={loading} />
      ) : (
        <>
          {/* Heatmap Layout Mode */}
          <div className="chart-card" style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 className="card-title" style={{ margin: 0 }}>Daily Heatmap — {selectedDeptName}</h3>
                <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', margin: '3px 0 0' }}>
                  Each cell = one day. Hover for exact values.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-main)', fontWeight: 500, background: 'var(--bg-outer)', borderRadius: '8px', padding: '6px 12px' }}>
                <Info size={13} color="var(--primary)" />
                Dark blue + light red rows on the same day = efficient production
              </div>
            </div>

            {loading ? (
              <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading heatmap...</div>
            ) : heatmapRows.length === 0 ? (
              renderEmptyState('There is no data matching this period.')
            ) : (
              <Heatmap rows={heatmapRows} dates={allDates} />
            )}
          </div>

          {/* Efficiency Details per Department */}
          {efficiencyKpis.length > 0 && (
            <SpotlightCard className="dribbble-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'var(--bg-outer)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={18} />
                </div>
                <div>
                  <h3 className="card-title" style={{ margin: 0 }}>Efficiency Summary — Per MT Produced</h3>
                  <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    Total period average — how much material per metric ton of output
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '0.75rem' }}>
                {efficiencyKpis.map((k) => {
                  // If deviation exists, color accordingly. Higher deviation = worse (usage > allowed).
                  let c = 'var(--text-main)';
                  let bg = 'var(--bg-outer)';
                  
                  if (k.deviation !== null && k.deviation !== undefined) {
                    if (k.deviation > 0) {
                      c = 'var(--danger)'; // Over-consuming
                      bg = 'color-mix(in srgb, var(--danger) 15%, transparent)';
                    } else if (k.deviation <= 0) {
                      c = 'var(--success)'; // Efficient
                      bg = 'color-mix(in srgb, var(--success) 15%, transparent)';
                    }
                  }

                  return (
                    <SpotlightCard key={k.kpi_id} className="dribbble-card" style={{ padding: '1.25rem' }}>
                      <div className="dribbble-header">
                        <span className="dribbble-title" style={{ fontSize: '0.85rem' }}>{k.kpi_name}</span>
                      </div>
                      <div className="dribbble-value" style={{ fontSize: '2rem', marginBottom: '0.5rem', color: c }}>
                        <CountUp to={k.value} duration={0.8} />
                      </div>
                      <div className="dribbble-footer">
                        <span className="dribbble-trend-pill neutral" style={{ background: bg, color: c }}>
                          {k.unit}
                        </span>
                        <span>over {fmt(k.total_weight_tons, 1)} MT</span>
                      </div>
                    </SpotlightCard>
                  );
                })}
              </div>
            </SpotlightCard>
          )}
        </>
      )}
    </div>
  );
};

export default Analytics;
