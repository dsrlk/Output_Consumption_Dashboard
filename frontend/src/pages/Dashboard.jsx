import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategorySummary, getCategoryPerTon, getStandards, getSections, getTrends, getCategoryDailyMatrix } from '../services/api';
import { AlignVerticalSpaceAround, Factory, Filter, TrendingUp, TrendingDown, X, BarChart2, ChevronRight } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  LineChart, Line, ReferenceLine, Area, AreaChart, Legend, ComposedChart
} from 'recharts';
import { useFilters } from '../context/FilterContext';
import CustomSelect from '../components/CustomSelect';
import BlurText from '../components/animations/BlurText';
import SpotlightCard from '../components/animations/SpotlightCard';
import CountUp from '../components/animations/CountUp';

// ── Helper: format %
const fmtPct = (raw) => `${raw > 0 ? '+' : ''}${raw.toFixed(1)}%`;

const KpiDetailPanel = ({ kpi, standard, standardMeta, selectedSection, startDate, endDate, onClose, isOutput, navigate, setViewMode, viewMode, totalWeightKg }) => {
  const panelRef = useRef(null);
  // Stable per-instance unique ID to avoid SVG gradient ID collisions across charts
  const gradientUid = useRef(`grad-${kpi.kpi_id}-${Math.random().toString(36).slice(2, 7)}`);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        const cardEl = document.getElementById(`kpi-card-${kpi.kpi_id}`);
        if (cardEl) {
          const y = cardEl.getBoundingClientRect().top + window.pageYOffset - 120;
          window.scrollTo({ top: y, behavior: 'smooth' });
        } else if (panelRef.current) {
          panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  }, [loading, kpi.kpi_id]);

  const isTonStd = standardMeta?.period_type === 'ton';

  // If a per-ton standard is set and we have the corrugator output weight,
  // we can compute a total-period standard: std_per_ton × total_tons
  const totalWeightTons = (totalWeightKg && totalWeightKg > 0) ? totalWeightKg / 1000 : null;
  const totalStdFromTon = (isTonStd && standard != null && totalWeightTons)
    ? standard * totalWeightTons : null;

  useEffect(() => {
    setLoading(true);
    let cancelled = false;
    getTrends(kpi.kpi_id, {
      section_id: selectedSection,
      view_mode: viewMode,
      ...(startDate ? { start_date: startDate } : {}),
      ...(endDate   ? { end_date:   endDate   } : {}),
    })
      .then(d => { if (!cancelled) setTrend(d); })
      .catch(() => { if (!cancelled) setTrend([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [kpi.kpi_id, selectedSection, startDate, endDate, viewMode]);

  // Stats from trend data
  const values   = trend.map(t => t.total).filter(v => v != null && v > 0);
  const avg      = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  // Period total = sum of daily values
  const periodTotal = values.length ? values.reduce((a, b) => a + b, 0) : null;
  const minVal   = values.length ? Math.min(...values) : null;
  const maxVal   = values.length ? Math.max(...values) : null;

  // Deviation from direct standard (useful when standard unit matches view mode)
  const isMatchingStd = ((isTonStd && viewMode === 'per_ton') || (!isTonStd && viewMode === 'total')) && kpi.pre_computed_period_std == null;
  const stdDev  = isMatchingStd && standard != null && standard !== 0 && avg != null
    ? ((avg - standard) / standard) * 100 : null;
  const stdGood = stdDev != null ? (isOutput ? stdDev >= 0 : stdDev <= 0) : null;
  const absStdDev = isMatchingStd && standard != null && avg != null ? avg - standard : null;

  // Deviation using computed total-period standard (per-ton std × total tons OR pre-computed standard)
  const effectiveTotalStd = (viewMode === 'total') ? (kpi.pre_computed_period_std ?? totalStdFromTon) : null;

  // For color determination, prefer kpi.value (pre-aggregated summary value, same as card)
  // over periodTotal (re-derived from trend, filtered to days>0, which can differ slightly).
  // This ensures the chart color always matches the KPI card color.
  const kpiSummaryValue = typeof kpi.value === 'number' ? kpi.value : null;
  const colorBaseValue  = kpiSummaryValue ?? periodTotal;  // prefer summary

  const totalDev  = viewMode === 'total' && effectiveTotalStd != null && effectiveTotalStd !== 0 && colorBaseValue != null
    ? ((colorBaseValue - effectiveTotalStd) / effectiveTotalStd) * 100 : null;
  const totalGood = totalDev != null ? (isOutput ? totalDev >= 0 : totalDev <= 0) : null;
  const absTotalDev = viewMode === 'total' && effectiveTotalStd != null && periodTotal != null ? periodTotal - effectiveTotalStd : null;

  // ── Per-ton fetch: get actual consumption/ton + total weight for the period ─
  const [perTonData,    setPerTonData]    = useState(null);
  const [perTonLoading, setPerTonLoading] = useState(false);

  useEffect(() => {
    if (!isTonStd) { setPerTonData(null); return; }
    setPerTonLoading(true);
    let cancelled = false;
    getCategoryPerTon({
      section_id: selectedSection,
      ...(startDate ? { start_date: startDate } : {}),
      ...(endDate   ? { end_date:   endDate   } : {}),
    })
      .then(rows => { if (!cancelled) setPerTonData(rows.find(r => r.kpi_id === kpi.kpi_id) ?? null); })
      .catch(() => { if (!cancelled) setPerTonData(null); })
      .finally(() => { if (!cancelled) setPerTonLoading(false); });
    return () => { cancelled = true; };
  }, [isTonStd, kpi.kpi_id, selectedSection, startDate, endDate]);

  const perTonValue = perTonData?.value ?? null;
  const weightTons  = perTonData?.total_weight_tons ?? null;
  const tonDev      = perTonValue != null && standard != null && standard !== 0
    ? ((perTonValue - standard) / standard) * 100 : null;
  const tonGood     = tonDev != null ? (isOutput ? tonDev >= 0 : tonDev <= 0) : null;

  // Chart Reference Line Calculation
  let chartStd = null;
  let chartStdColor = '#ef4444'; 
  let chartStdFill = '#dc2626';

  if (viewMode === 'total') {
    if (kpi.pre_computed_period_std != null) {
      // It's a pre-computed TOTAL period budget. Divide by days to get a flat daily average line
      const activeDays = kpi.working_days > 0 ? kpi.working_days : trend.length;
      if (activeDays > 0) {
        chartStd = kpi.pre_computed_period_std / activeDays;
        chartStdColor = totalGood ? '#22c55e' : '#ef4444';
        chartStdFill = totalGood ? '#16a34a' : '#dc2626';
      }
    } else if (!isTonStd && standard != null) {
      chartStd = standard;
      chartStdColor = stdGood ? '#22c55e' : '#ef4444';
      chartStdFill = stdGood ? '#16a34a' : '#dc2626';
    } else if (isTonStd && totalStdFromTon != null) {
      const activeDays = kpi.working_days > 0 ? kpi.working_days : trend.length;
      if (activeDays > 0) {
        chartStd = totalStdFromTon / activeDays;
        chartStdColor = totalGood ? '#22c55e' : '#ef4444';
        chartStdFill = totalGood ? '#16a34a' : '#dc2626';
      }
    }
  } else if (viewMode === 'per_ton') {
    if (isTonStd && standard != null) {
      chartStd = standard;
      chartStdColor = tonGood ? '#22c55e' : '#ef4444';
      chartStdFill = tonGood ? '#16a34a' : '#dc2626';
    }
  }

  // ── DIAGNOSTIC (remove after fix confirmed) ──────────────────────────────
  console.log('[KpiDetailPanel COLOR DEBUG]', {
    kpi_name: kpi.kpi_name,
    kpi_id: kpi.kpi_id,
    isOutput_prop: isOutput,
    'standardMeta?.category': standardMeta?.category,
    'standardMeta?.period_type': standardMeta?.period_type,
    standard,
    'kpi.value': kpi.value,
    'kpi.pre_computed_period_std': kpi.pre_computed_period_std,
    'kpi.working_days': kpi.working_days,
    viewMode,
    isTonStd,
    effectiveTotalStd,
    colorBaseValue,
    totalDev,
    totalGood,
    stdDev,
    stdGood,
    chartStd,
    chartStdColor,
    trend_length: trend.length,
    avg,
    periodTotal,
  });
  // ─────────────────────────────────────────────────────────────────────────

  const unit = kpi.unit || '';
  const rawUnit = unit.replace('/Ton', '').replace('per Ton', '').trim() || '';

  let chartLineColor = "var(--text-main)"; // default black
  if (chartStd != null) {
     chartLineColor = chartStdColor;
  }

  return (
    <div ref={panelRef} style={{
      marginTop: '1rem',
      borderRadius: '14px',
      border: '1.5px solid var(--border-color)',
      background: 'var(--card-bg)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      overflow: 'hidden',
      animation: 'fadeInScale 0.2s ease',
    }}>
      {/* Panel header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1rem 1.5rem',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-color)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <BarChart2 size={18} style={{ color: 'var(--primary)' }} />
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{kpi.kpi_name}</span>
          {unit && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--border-color)', padding: '2px 8px', borderRadius: '99px' }}>{unit}</span>}
        </div>
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ padding: '1.25rem 1.5rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Loading trend data...
          </div>
        ) : trend.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
            No trend data available for this period.
          </div>
        ) : (
          <>
            {/* Stat pills row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>

              {/* Average vs Standard */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.65rem 1rem', minWidth: '140px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {viewMode === 'per_ton' ? 'Daily Avg / Ton' : 'Daily Volume Avg'}
                </span>
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  {avg != null ? avg.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                  {<span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '3px' }}>{viewMode === 'per_ton' ? unit : rawUnit}</span>}
                </span>
              </div>

              {/* Standard value — show for daily standards; for per-ton show computed total */}
              {standard != null && isMatchingStd && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.65rem 1rem', minWidth: '140px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Benchmark</span>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    {standard.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    {unit && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '3px' }}>{viewMode === 'per_ton' ? unit : rawUnit}</span>}
                  </span>
                </div>
              )}
              {viewMode === 'total' && effectiveTotalStd != null && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.65rem 1rem', minWidth: '160px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Benchmark</span>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    {effectiveTotalStd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    {rawUnit && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '3px' }}>{rawUnit}</span>}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', opacity: 0.8 }}>
                    {kpi.pre_computed_period_std != null ? 'Pre-computed Global Target' : `${standard.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${unit} × ${totalWeightTons?.toLocaleString(undefined, { maximumFractionDigits: 1 })}t`}
                  </span>
                </div>
              )}

              {/* vs Benchmark */}
              {viewMode === 'total' && totalDev != null ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', background: totalGood ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)', border: `1.5px solid ${totalGood ? '#86efac' : '#fca5a5'}`, borderRadius: '10px', padding: '0.65rem 1rem', minWidth: '160px' }}>
                    <span style={{ fontSize: '0.7rem', color: totalGood ? '#15803d' : '#b91c1c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>vs Total Benchmark</span>
                    <span style={{ fontWeight: 800, fontSize: '1.15rem', color: totalGood ? '#15803d' : '#b91c1c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {totalGood ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                      {fmtPct(totalDev)}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: totalGood ? '#16a34a' : '#dc2626', opacity: 0.8 }}>
                      Actual: {periodTotal?.toLocaleString(undefined, { maximumFractionDigits: 0 })} {rawUnit}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.65rem 1rem', minWidth: '130px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Variance</span>
                    <span style={{ fontWeight: 800, fontSize: '1.15rem', color: absTotalDev > 0 ? (isOutput ? '#16a34a' : '#dc2626') : (isOutput ? '#dc2626' : '#16a34a') }}>
                      {absTotalDev > 0 ? '+' : ''}{absTotalDev.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      <span style={{ fontSize: '0.72rem', marginLeft: '3px' }}>{rawUnit}</span>
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>From Target</span>
                  </div>
                </>
              ) : (isTonStd || kpi.pre_computed_period_std != null) && viewMode === 'total' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', background: 'rgba(245,158,11,0.06)', border: '1.5px dashed #f59e0b55', borderRadius: '10px', padding: '0.65rem 1rem', minWidth: '200px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#92400e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>vs Benchmark</span>
                  <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#b45309' }}>Per-ton standard set</span>
                  <span style={{ fontSize: '0.68rem', color: '#92400e', opacity: 0.85 }}>
                    Std: {standard?.toLocaleString(undefined, { maximumFractionDigits: 4 })} {unit} — 
                    <button
                      onClick={() => {
                        if (setViewMode) setViewMode('per_ton');
                        else navigate('/', { state: { viewMode: 'per_ton' } });
                      }}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#d97706', fontSize: '0.68rem', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: '2px' }}
                    >
                      switch to Per Ton view →
                    </button>
                  </span>
                </div>
              ) : stdDev != null ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', background: stdGood ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)', border: `1.5px solid ${stdGood ? '#86efac' : '#fca5a5'}`, borderRadius: '10px', padding: '0.65rem 1rem', minWidth: '160px' }}>
                    <span style={{ fontSize: '0.7rem', color: stdGood ? '#15803d' : '#b91c1c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>vs Benchmark</span>
                    <span style={{ fontWeight: 800, fontSize: '1.15rem', color: stdGood ? '#15803d' : '#b91c1c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {stdGood ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                      {fmtPct(stdDev)}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: stdGood ? '#16a34a' : '#dc2626', opacity: 0.8 }}>
                      Std: {standard.toLocaleString(undefined, { maximumFractionDigits: 2 })} {unit}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.65rem 1rem', minWidth: '130px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Variance</span>
                    <span style={{ fontWeight: 800, fontSize: '1.15rem', color: absStdDev > 0 ? (isOutput ? '#16a34a' : '#dc2626') : (isOutput ? '#dc2626' : '#16a34a') }}>
                      {absStdDev > 0 ? '+' : ''}{absStdDev.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                      <span style={{ fontSize: '0.72rem', marginLeft: '3px' }}>{viewMode === 'per_ton' ? unit : rawUnit}</span>
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>From Target</span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', background: 'var(--bg-color)', border: '1.5px dashed var(--border-color)', borderRadius: '10px', padding: '0.65rem 1rem', minWidth: '160px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>vs Benchmark</span>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No standard set</span>
                  <span style={{ fontSize: '0.68rem', marginTop: '2px' }}>
                    <button
                      onClick={() => navigate('/data-hub', { state: { tab: 'Benchmark Standards', section: selectedSection } })}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--primary)', fontSize: '0.68rem', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: '2px' }}
                    >
                      Set one in Data Hub →
                    </button>
                  </span>
                </div>
              )}



              {/* Min */}
              {minVal != null && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.65rem 1rem', minWidth: '120px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Min</span>
                  <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{minVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              )}

              {/* Max */}
              {maxVal != null && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.65rem 1rem', minWidth: '120px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Max</span>
                  <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{maxVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>

            {/* Trend chart */}
            <div style={{ height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={gradientUid.current} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={chartLineColor} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={chartLineColor} stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                    tickFormatter={d => d ? d.slice(5) : ''} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                    tickFormatter={v => v.toLocaleString(undefined, { maximumFractionDigits: 1 })} width={55} />
                  <Tooltip
                    contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.8rem' }}
                    formatter={(v) => [v != null ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ((viewMode === 'per_ton' ? unit : rawUnit) ? ` ${(viewMode === 'per_ton' ? unit : rawUnit)}` : '') : '—', kpi.kpi_name]}
                    labelFormatter={l => `Date: ${l}`}
                  />
                  {chartStd != null && (
                    <ReferenceLine y={chartStd} stroke={chartStdColor}
                      strokeDasharray="5 3" strokeWidth={1.5} />
                  )}
                  <Area type="monotone" dataKey="total" stroke={chartLineColor} strokeWidth={2}
                    fill={`url(#${gradientUid.current})`} dot={false} activeDot={{ r: 4 }} />
                  {trend.some(t => t.is_anomaly) && (
                    <Line type="monotone" dataKey={d => d.is_anomaly ? d.total : null}
                      stroke="#f59e0b" strokeWidth={0} dot={{ r: 5, fill: '#f59e0b', strokeWidth: 0 }} />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.75rem', padding: '0.5rem 0.85rem', background: 'var(--bg-outer)', borderRadius: '8px', fontSize: '0.72rem', color: 'var(--text-main)', fontWeight: 600, width: 'fit-content', border: '1px solid var(--border-color)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '16px', height: '0', borderTop: `2.5px solid ${chartLineColor}` }} />
                <span>Daily Value</span>
              </span>
              {chartStd != null && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ display: 'inline-block', width: '16px', height: '0', borderTop: `2.5px dashed ${chartStdColor}` }} />
                  <span>Target Benchmark <span style={{ opacity: 0.8, fontWeight: 700 }}>({chartStd.toLocaleString(undefined, { maximumFractionDigits: 1 })} {viewMode === 'per_ton' ? unit : rawUnit})</span></span>
                </span>
              )}
              {trend.some(t => t.is_anomaly) && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 0 2px rgba(245,158,11,0.2)' }} />
                  <span>Anomaly Detected</span>
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── KPI Grouping helper ──────────────────────────────────────────────────────
// Strips known metric-type suffixes from a KPI name to derive a machine/group
// prefix.  E.g. "P1 & P6 Qty" → "P1 & P6", "Efficiency" → null (no prefix).
const METRIC_SUFFIXES = new Set([
  'qty', 'quantity', 'weight', 'count', 'pcs', 'kg', 'liters',
  'litres', 'hours', 'output', 'volume', 'rate', 'value',
]);

function getKpiPrefix(name) {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return null;
  const last = words[words.length - 1].toLowerCase();
  return METRIC_SUFFIXES.has(last) ? words.slice(0, -1).join(' ') : null;
}

/**
 * Groups an array of KPI rows by shared name-prefix.
 * Returns an array of { groupLabel: string|null, items: kpi[] }.
 * groupLabel is null for KPIs that don't share a prefix with at least one other.
 */
function groupKpis(kpis) {
  // Count how often each prefix appears
  const prefixCount = {};
  kpis.forEach(k => {
    const p = getKpiPrefix(k.kpi_name);
    if (p) prefixCount[p] = (prefixCount[p] || 0) + 1;
  });
  // Only valid if ≥ 2 KPIs share the prefix
  const validPrefixes = new Set(Object.keys(prefixCount).filter(p => prefixCount[p] >= 2));

  // Build groups preserving original ordering
  const buckets = {};   // prefix → items[]
  const ungrouped = [];
  const order = [];     // ordered distinct group labels

  kpis.forEach(k => {
    const p = getKpiPrefix(k.kpi_name);
    if (p && validPrefixes.has(p)) {
      if (!buckets[p]) { buckets[p] = []; order.push(p); }
      buckets[p].push(k);
    } else {
      ungrouped.push(k);
    }
  });

  const result = order.map(p => ({ groupLabel: p, items: buckets[p] }));

  // Merge ungrouped items into the 'Total' group if one exists;
  // otherwise fall-back to a plain ungrouped bucket.
  const totalGroup = result.find(g => g.groupLabel?.toLowerCase() === 'total');
  if (totalGroup && ungrouped.length) {
    totalGroup.items = [...totalGroup.items, ...ungrouped];
  } else if (ungrouped.length) {
    result.push({ groupLabel: null, items: ungrouped });
  }

  // Move the Total group to the front so it's the first pill
  const totalIdx = result.findIndex(g => g.groupLabel?.toLowerCase() === 'total');
  if (totalIdx > 0) {
    const [tg] = result.splice(totalIdx, 1);
    result.unshift(tg);
  }

  return result;
}

// ── Smart Insights Panel ──────────────────────────────────────────────────────────
const SmartInsightsPanel = ({ categoryData, getDeviation, selectedCategory, selectedSectionName }) => {
  const alerts = [];
  const topPerformers = [];

  categoryData.forEach(kpi => {
    if (kpi.value === 'N/A') return;
    const dev = getDeviation(kpi);
    if (!dev) return;
    const item = { name: kpi.kpi_name, pct: dev.pct, raw: dev.raw, isGood: dev.isGood, isOutput: dev.isOutput };
    if (dev.isGood) topPerformers.push(item);
    else alerts.push(item);
  });

  alerts.sort((a, b) => parseFloat(b.pct) - parseFloat(a.pct));
  topPerformers.sort((a, b) => parseFloat(b.pct) - parseFloat(a.pct));

  if (alerts.length === 0 && topPerformers.length === 0) {
    return (
      <div className="chart-card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.75rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>📊</div>
          <div>
            <h3 className="card-title" style={{ margin: 0 }}>Automated Insights — {selectedSectionName}</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>No benchmarks defined</p>
          </div>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, borderLeft: '3px solid var(--border-color)', paddingLeft: '0.75rem' }}>
          No standard benchmarks are defined for these metrics. Define benchmarks in the Data Hub to unlock automated performance analysis.
        </p>
      </div>
    );
  }

  const isOutput = selectedCategory === 'Output';
  const total = alerts.length + topPerformers.length;

  const critical = alerts.filter(a => parseFloat(a.pct) >= 20);
  const warning  = alerts.filter(a => parseFloat(a.pct) >= 10 && parseFloat(a.pct) < 20);
  const minor    = alerts.filter(a => parseFloat(a.pct) < 10);

  const maxPct = Math.max(...[...alerts, ...topPerformers].map(i => parseFloat(i.pct)), 1);
  const healthScore = total > 0 ? Math.round((topPerformers.length / total) * 100) : 0;
  const healthColor = healthScore >= 70 ? '#22c55e' : healthScore >= 40 ? '#f59e0b' : '#ef4444';

  // Reusable severity row with deviation bar
  const SeverityRow = ({ item, color, bgColor, borderColor, barGradient }) => {
    const barWidth = Math.min((parseFloat(item.pct) / maxPct) * 100, 100);
    const itemIsOutput = item.isOutput;
    return (
      <div style={{ background: bgColor, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '0.8rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-color)' }}>{item.name}</span>
          <span style={{ fontWeight: 800, fontSize: '0.88rem', color, background: `${color}18`, padding: '3px 11px', borderRadius: '999px' }}>
            {item.raw > 0 ? '+' : '-'}{item.pct}%
          </span>
        </div>
        <div style={{ position: 'relative', height: '6px', borderRadius: '99px', background: 'rgba(0,0,0,0.07)' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${barWidth}%`, background: barGradient, borderRadius: '99px', transition: 'width 0.7s cubic-bezier(.4,0,.2,1)' }} />
        </div>
        <span style={{ fontSize: '0.71rem', color, opacity: 0.85 }}>
          {itemIsOutput ? 'Output is below benchmark by' : 'Usage is over benchmark by'} <strong>{item.pct}%</strong>
        </span>
      </div>
    );
  };

  return (
    <div className="chart-card" style={{ marginTop: '1.5rem', paddingBottom: '1.75rem' }}>

      {/* Header + Summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 className="card-title" style={{ marginBottom: '0.2rem' }}>Automated Insights — {selectedSectionName}</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Benchmark performance analysis for the selected period</p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Health Score ring */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: `${healthColor}12`, border: `1.5px solid ${healthColor}40`, borderRadius: '12px', padding: '0.45rem 1rem' }}>
            <div style={{ position: 'relative', width: '32px', height: '32px' }}>
              <svg width="32" height="32" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="13" fill="none" stroke="var(--border-color)" strokeWidth="3" />
                <circle cx="16" cy="16" r="13" fill="none" stroke={healthColor} strokeWidth="3"
                  strokeDasharray={`${(healthScore / 100) * 81.7} 81.7`} strokeLinecap="round" transform="rotate(-90 16 16)" />
              </svg>
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 800, color: healthColor }}>{healthScore}</span>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: healthColor }}>Health Score</div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{topPerformers.length}/{total} on target</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '0.45rem 1rem' }}>
            <div style={{ fontWeight: 800, fontSize: '1.3rem', color: '#ef4444', lineHeight: 1 }}>{alerts.length}</div>
            <div style={{ fontSize: '0.62rem', color: '#b91c1c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>Over Limit</div>
          </div>

          <div style={{ textAlign: 'center', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', padding: '0.45rem 1rem' }}>
            <div style={{ fontWeight: 800, fontSize: '1.3rem', color: '#22c55e', lineHeight: 1 }}>{topPerformers.length}</div>
            <div style={{ fontSize: '0.62rem', color: '#15803d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>On Target</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

        {critical.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.8rem' }}>
              <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.64rem', fontWeight: 800, padding: '3px 10px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🔴 Critical</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>≥ 20% over benchmark — immediate action needed</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {critical.map((a, i) => <SeverityRow key={i} item={a} color="#dc2626" bgColor="rgba(239,68,68,0.05)" borderColor="rgba(239,68,68,0.22)" barGradient="linear-gradient(90deg,#ef4444,#f87171)" />)}
            </div>
          </div>
        )}

        {warning.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.8rem' }}>
              <span style={{ background: '#f59e0b', color: '#fff', fontSize: '0.64rem', fontWeight: 800, padding: '3px 10px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🟡 Warning</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>10–20% over benchmark — monitor closely</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {warning.map((a, i) => <SeverityRow key={i} item={a} color="#d97706" bgColor="rgba(245,158,11,0.05)" borderColor="rgba(245,158,11,0.22)" barGradient="linear-gradient(90deg,#f59e0b,#fcd34d)" />)}
            </div>
          </div>
        )}

        {minor.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.8rem' }}>
              <span style={{ background: '#64748b', color: '#fff', fontSize: '0.64rem', fontWeight: 800, padding: '3px 10px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🔵 Minor</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>&lt; 10% over benchmark — within acceptable range</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {minor.map((a, i) => <SeverityRow key={i} item={a} color="#475569" bgColor="rgba(100,116,139,0.05)" borderColor="rgba(100,116,139,0.18)" barGradient="linear-gradient(90deg,#64748b,#94a3b8)" />)}
            </div>
          </div>
        )}

        {topPerformers.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.8rem' }}>
              <span style={{ background: '#22c55e', color: '#fff', fontSize: '0.64rem', fontWeight: 800, padding: '3px 10px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🟢 Within Target</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                At or above/below their individual benchmarks — efficient
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {topPerformers.map((p, i) => {
                const barWidth = Math.min((parseFloat(p.pct) / maxPct) * 100, 100);
                return (
                  <div key={i} style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.18)', borderRadius: '10px', padding: '0.8rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-color)' }}>{p.name}</span>
                      <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#16a34a', background: 'rgba(34,197,94,0.12)', padding: '3px 11px', borderRadius: '999px' }}>
                        {p.raw > 0 ? '+' : '-'}{p.pct}%
                      </span>
                    </div>
                    <div style={{ position: 'relative', height: '6px', borderRadius: '99px', background: 'rgba(0,0,0,0.07)' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${barWidth}%`, background: 'linear-gradient(90deg,#22c55e,#4ade80)', borderRadius: '99px', transition: 'width 0.7s cubic-bezier(.4,0,.2,1)' }} />
                    </div>
                    <span style={{ fontSize: '0.71rem', color: '#15803d', opacity: 0.85 }}>
                      {p.isOutput ? 'Output exceeds' : 'Usage is under'} benchmark by <strong>{p.pct}%</strong>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Dashboard ────────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const [categoryData, setCategoryData]   = useState([]);
  const [dailyMatrix, setDailyMatrix]     = useState({ dates: [], series: [] });
  const [standards, setStandards]         = useState({});
  const [standardsMeta, setStandardsMeta] = useState({});  // { kpi_id: { period_type, standard_value } }
  const [loading, setLoading]             = useState(false);
  const [sectionsList, setSectionsList]   = useState([]);
  const [viewMode, setViewMode]           = useState('total');
  const [selectedKpi, setSelectedKpi]     = useState(null);   // KPI object selected for detail
  const [machineFilter, setMachineFilter] = useState(null); // null = show all, or a group prefix string

  const { selectedSection, setSelectedSection, selectedCategory, setSelectedCategory, startDate, setStartDate, endDate, setEndDate } = useFilters();

  const selectedSectionName = sectionsList.find(s => s.id.toString() === selectedSection)?.name || '';
  const isSales   = selectedSectionName === 'Sales';
  const showPerTon = viewMode === 'per_ton' && selectedCategory === 'Consumption' && !isSales && selectedSection !== '0';

  const [cols, setCols] = useState(1);
  useEffect(() => {
    const updateCols = () => {
      // main-content has max-width: 1800px and padding 3rem left+right (96px)
      const maxAvailable = Math.min(document.documentElement.clientWidth, 1800) - 96;
      // .dashboard-grid minmax(280px, 1fr) with 1.5rem (24px) gap => total col space 304px
      const c = Math.max(1, Math.floor((maxAvailable + 24) / 304));
      setCols(c);
    };
    updateCols();
    window.addEventListener('resize', updateCols);
    return () => window.removeEventListener('resize', updateCols);
  }, []);

  useEffect(() => {
    const initDropdowns = async () => {
      try {
        const sData = await getSections();
        // guarantee 'Overall' always appears without a backend restart
        const enhancedData = [{ id: 0, name: 'Overall' }, ...sData.filter(s => s.id !== 0)];
        setSectionsList(enhancedData);
        if (!selectedSection && enhancedData.length > 0) {
          setSelectedSection(String(enhancedData[0].id));
        }
      } catch (err) { console.error('Error loading filters', err); }
    };
    initDropdowns();
  }, []);

  useEffect(() => {
    if (isSales) { setSelectedCategory('Orders'); }
    else if (selectedCategory === 'Orders') { setSelectedCategory('Consumption'); }
  }, [isSales]);

  useEffect(() => {
    if (selectedSection == null || selectedSection === '') return;
    getStandards({ section_id: selectedSection })
      .then(data => {
        const map = {}, meta = {};
        data.forEach(s => {
          map[s.kpi_id]  = s.standard_value;
          meta[s.kpi_id] = { standard_value: s.standard_value, period_type: s.period_type, category: s.category };
        });
        setStandards(map);
        setStandardsMeta(meta);
      })
      .catch(() => { setStandards({}); setStandardsMeta({}); });
  }, [selectedSection]);

  useEffect(() => {
    if (selectedSection == null || selectedSection === '' || !selectedCategory) return;
    let cancelled = false;
    setCategoryData([]);
    setDailyMatrix({ dates: [], series: [] });
    setSelectedKpi(null);   // clear detail when filters change
    
    const loadData = async () => {
      setLoading(true);
      try {
        const params = { section_id: selectedSection, category: selectedCategory };
        if (startDate) params.start_date = startDate;
        if (endDate)   params.end_date   = endDate;
        
        const [cData, mData] = await Promise.all([
          showPerTon ? getCategoryPerTon(params) : getCategorySummary(params),
          getCategoryDailyMatrix(params).catch(err => {
            console.error('Matrix load failed (backend needs restart?)', err);
            return { dates: [], series: [] };
          })
        ]);
        
        if (!cancelled) {
          setCategoryData(cData);
          setDailyMatrix(mData);
        }
      } catch (error) { 
        console.error('Error loading dashboard data', error); 
      } finally { 
        if (!cancelled) setLoading(false); 
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, [selectedSection, selectedCategory, startDate, endDate, viewMode]);

  // Auto-select the 'Total' group as default whenever data reloads
  useEffect(() => {
    const groups = groupKpis(categoryData);
    const totalGroup = groups.find(g => g.groupLabel?.toLowerCase() === 'total');
    setMachineFilter(totalGroup ? totalGroup.groupLabel : null);
    setSelectedKpi(null);
  }, [categoryData]);

  const getDeviation = (kpi) => {
    const meta = standardsMeta[kpi.kpi_id];
    const std  = meta?.standard_value;
    const actualCategory = meta?.category || selectedCategory;
    const isOutput = actualCategory === 'Output';

    // --- Pre-computed period standard (e.g. Glue in Overall) ---
    // The backend already calculated the exact total budget: std × per-section days. Use it directly.
    if (kpi.pre_computed_period_std != null) {
      const periodStd = kpi.pre_computed_period_std;
      if (periodStd <= 0) return null;
      const pct    = ((kpi.value - periodStd) / periodStd) * 100;
      const isGood = isOutput ? pct >= 0 : pct <= 0;
      return { pct: Math.abs(pct).toFixed(1), isGood, isOutput, raw: pct, periodStd, workingDays: null, dailyStd: null, isPctKpi: false, isTonStd: false, isPreComputed: true };
    }

    if (std == null || std === 0) return null;

    const periodType  = meta?.period_type ?? 'day';
    const workingDays = kpi.working_days ?? null;
    const isPctKpi    = kpi.aggregation === 'avg_working_days';
    const isTonKpi    = kpi.aggregation === 'per_ton';

    // --- Per-Ton standard ---
    if (periodType === 'ton') {
      if (isTonKpi) {
        // Per-ton view: compare actual per-ton rate directly
        const pct    = ((kpi.value - std) / std) * 100;
        const isGood = isOutput ? pct >= 0 : pct <= 0;
        return { pct: Math.abs(pct).toFixed(1), isGood, isOutput, raw: pct, periodStd: std, workingDays: null, dailyStd: std, isPctKpi: false, isTonStd: true };
      }

      // Total view: compute expected total = std_per_ton × total_output_tons
      const totalWeightKg = kpi.total_weight_kg ?? null;
      if (!totalWeightKg || totalWeightKg <= 0) return null;
      const totalWeightTons = totalWeightKg / 1000;
      const totalStd = std * totalWeightTons;
      if (totalStd === 0) return null;
      const pct    = ((kpi.value - totalStd) / totalStd) * 100;
      const isGood = isOutput ? pct >= 0 : pct <= 0;
      return {
        pct: Math.abs(pct).toFixed(1), isGood, isOutput, raw: pct,
        periodStd: totalStd,
        workingDays: null,
        dailyStd: std,
        isPctKpi: false,
        isTonStd: true,
        totalWeightTons: Math.round(totalWeightTons * 10) / 10,
      };
    }

    // --- Per-Day standard (scaled by actual working days) ---
    if (isTonKpi) return null;

    const periodStd = (!isPctKpi && workingDays && periodType === 'day')
      ? std * workingDays
      : std;

    const pct    = ((kpi.value - periodStd) / periodStd) * 100;
    const isGood = isOutput ? pct >= 0 : pct <= 0;
    return { pct: Math.abs(pct).toFixed(1), isGood, isOutput, raw: pct, periodStd, workingDays, dailyStd: std, isPctKpi, isTonStd: false };
  };

  const isOutput = selectedCategory === 'Output';
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ marginBottom: '2.5rem' }}>
        <div className="page-header" style={{ marginBottom: '1.5rem' }}>
          <BlurText className="page-title" text="Output and Consumption Analysis" />
        </div>

        {/* Constraints Bar */}
        <div className="filters-bar">
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.95rem', paddingBottom: '0.65rem' }}>
            <Filter size={18} style={{ marginRight: '8px', color: 'var(--text-muted)' }} /> Filters
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Section</span>
            <CustomSelect 
              value={String(selectedSection)} 
              onChange={val => setSelectedSection(val)} 
              options={sectionsList.map(s => ({ value: String(s.id), label: s.name }))} 
              style={{ width: '180px' }} 
            />
          </div>

          {selectedSection !== '0' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category</span>
              <CustomSelect 
                value={selectedCategory} 
                onChange={val => setSelectedCategory(val)} 
                options={isSales 
                  ? [{ value: 'Orders', label: 'Orders Brought In' }] 
                  : [{ value: 'Consumption', label: 'Consumption' }, { value: 'Output', label: 'Output' }]} 
                style={{ width: '160px' }} 
              />
            </div>
          )}

          {selectedSection !== '0' && !isSales && selectedCategory === 'Consumption' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>View</span>
              <CustomSelect 
                value={viewMode} 
                onChange={val => setViewMode(val)} 
                options={[{ value: 'total', label: 'Total' }, { value: 'per_ton', label: 'Per Ton' }]} 
                style={{ width: '140px' }} 
              />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From Date</span>
            <input type="date" className="date-input"
              value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>To Date</span>
            <input type="date" className="date-input"
              value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Skeletons */}
      {loading && (
        <div className="dashboard-grid">
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{height: '130px'}}></div>)}
        </div>
      )}

      {/* Empty State */}
      {!loading && categoryData.length === 0 && (
        <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <div style={{ background: 'var(--bg-outer)', padding: '16px', borderRadius: '50%', marginBottom: '16px' }}>
            <BarChart2 size={32} opacity={0.5} />
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>No Data Available</div>
          <div style={{ fontSize: '0.85rem', marginTop: '6px' }}>There is no data matching this period for {selectedCategory}.</div>
        </div>
      )}

      {/* KPI Cards */}
      {!loading && categoryData.length > 0 && (
        <>
          {/* ── Machine filter pills + hint row ── */}
          {(() => {
            const groups = groupKpis(categoryData);
            const hasGroups = groups.some(g => g.groupLabel !== null);
            if (!hasGroups) return (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ChevronRight size={13} /> Click any KPI card to drill into its trend & analytics
              </div>
            );
            const pills = groups.filter(g => g.groupLabel !== null).map(g => g.groupLabel);
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.9rem', flexWrap: 'wrap' }}>
                {pills.map(pill => {
                  const active = machineFilter === pill;
                  return (
                    <button
                      key={pill}
                      onClick={() => { setMachineFilter(active ? null : pill); setSelectedKpi(null); }}
                      style={{
                        padding: '4px 14px',
                        borderRadius: '999px',
                        border: active ? '1.5px solid var(--primary)' : '1.5px solid var(--border-color)',
                        background: active ? 'var(--primary)' : 'var(--card-bg)',
                        color: active ? '#fff' : 'var(--text-muted)',
                        fontSize: '0.72rem',
                        fontWeight: active ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        letterSpacing: '0.03em',
                      }}
                    >
                      {pill}
                    </button>
                  );
                })}
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.25rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ChevronRight size={12} /> Click a card to drill in
                </span>
              </div>
            );
          })()}

          {/* ── KPI Cards (flat grid, filtered by machineFilter) ── */}
          {(() => {
            const groups = groupKpis(categoryData);
            const hasGroups = groups.some(g => g.groupLabel !== null);

            // Which KPIs to show: filter by selected machine group
            let visibleKpis = categoryData;
            let activeGroupLabel = null;
            if (hasGroups && machineFilter !== null) {
              const grp = groups.find(g => g.groupLabel === machineFilter);
              visibleKpis     = grp ? grp.items : [];
              activeGroupLabel = machineFilter;
            }

            // Card renderer
            const renderCard = (kpi) => {
              const dev = getDeviation(kpi);
              const isSelected = selectedKpi?.kpi_id === kpi.kpi_id;
              // Only strip the machine prefix from card title when the name
              // actually begins with that prefix (e.g. 'Total Qty' → 'Qty').
              // KPIs like 'Efficiency' that don't start with the prefix keep their full name.
              let displayName = kpi.kpi_name;
              if (activeGroupLabel) {
                const prefixWithSpace = activeGroupLabel + ' ';
                if (kpi.kpi_name.startsWith(prefixWithSpace)) {
                  displayName = kpi.kpi_name.slice(prefixWithSpace.length).trim() || kpi.kpi_name;
                }
              }
              return (
                <SpotlightCard
                  id={`kpi-card-${kpi.kpi_id}`}
                  className={`dribbble-card ${isSelected ? 'selected' : ''}`} key={kpi.kpi_id}
                  spotlightColor="rgba(15, 23, 42, 0.08)"
                  onClick={() => setSelectedKpi(isSelected ? null : kpi)}
                  style={{
                    outline: isSelected ? '2px solid var(--primary)' : 'none',
                    outlineOffset: '2px',
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                >
                  <div className="dribbble-header">
                    <span className="dribbble-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {displayName}
                      {isSelected && (
                        <span style={{ background: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.04em' }}>
                          SELECTED
                        </span>
                      )}
                    </span>
                    <button className="dribbble-action">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                    </button>
                  </div>

                  <div className="dribbble-value">
                    {typeof kpi.value === 'number' ? <CountUp to={kpi.value} duration={0.8} /> : kpi.value}
                    {kpi.unit && kpi.value !== 'N/A' ? <span style={{fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '4px'}}>{kpi.unit}</span> : ''}
                  </div>

                  <div className="dribbble-footer">
                    {dev ? (
                      <>
                        <span className={`dribbble-trend-pill ${dev.isGood ? 'positive' : 'negative'}`}>
                          {dev.isGood ? '↑' : '↓'} {Math.abs(dev.pct)}%
                        </span>
                        <span>
                          {dev.isTonStd
                            ? dev.totalWeightTons != null
                              ? `Std: ${dev.periodStd.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${kpi.unit}`
                              : `Std: ${dev.dailyStd.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${kpi.unit}`
                            : dev.isPctKpi
                              ? `Std: ${dev.dailyStd.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${kpi.unit}`
                              : `Std: ${dev.periodStd.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${kpi.unit}`
                          }
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="dribbble-trend-pill neutral">—</span>
                        <span>{showPerTon ? 'Consumption rate' : 'Total captured range'}</span>
                      </>
                    )}
                  </div>

                </SpotlightCard>
              );
            };

            const renderedCards = visibleKpis.map(k => renderCard(k));
            
            // Inject expanding Detail Panel dynamically below the active row
            if (selectedKpi) {
              const selectedIndex = visibleKpis.findIndex(k => k.kpi_id === selectedKpi.kpi_id);
              if (selectedIndex !== -1) {
                // Determine insertion point index (end of the row containing the selected item)
                const targetRowEndIndex = Math.min(
                  (Math.floor(selectedIndex / cols) + 1) * cols,
                  visibleKpis.length
                );
                
                const panel = (
                  <div key="detail-panel" style={{ gridColumn: '1 / -1', width: '100%', marginBottom: '0.5rem', animation: 'fadeUp 0.3s ease-out' }}>
                    <KpiDetailPanel
                      kpi={selectedKpi}
                      standard={standards[selectedKpi.kpi_id] ?? null}
                      standardMeta={standardsMeta[selectedKpi.kpi_id] ?? null}
                      selectedSection={selectedSection}
                      startDate={startDate}
                      endDate={endDate}
                      onClose={() => setSelectedKpi(null)}
                      isOutput={isOutput}
                      navigate={navigate}
                      setViewMode={setViewMode}
                      viewMode={viewMode}
                      totalWeightKg={selectedKpi.total_weight_kg ?? (selectedKpi.total_weight_tons ? selectedKpi.total_weight_tons * 1000 : null)}
                    />
                  </div>
                );
                
                renderedCards.splice(targetRowEndIndex, 0, panel);
              }
            }

            return <div className="dashboard-grid">{renderedCards}</div>;
          })()}

          {selectedSectionName === 'Overall' ? (
            <SmartInsightsPanel 
              categoryData={categoryData} 
              getDeviation={getDeviation} 
              selectedCategory={selectedCategory} 
              selectedSectionName={selectedSectionName} 
            />
          ) : (
            <>
              {(() => {
                const groups = groupKpis(categoryData);
                const hasGroups = groups.some(g => g.groupLabel !== null);

                let chartItems = categoryData;
                let chartGroupLabel = null;
                if (hasGroups && machineFilter !== null) {
                  const grp = groups.find(g => g.groupLabel === machineFilter);
                  chartItems     = grp ? grp.items : [];
                  chartGroupLabel = machineFilter;
                }
                
                if (chartItems.length === 0 || dailyMatrix.series.length === 0) return null;

                if (selectedCategory === 'Output' || selectedCategory === 'Orders') {
                  // Find primary metric with a CONFIGURED or COMPUTED standard
                  const candidateKpis = chartItems.filter(k => k.value !== 'N/A').map(k => {
                     let std = standards[k.kpi_id];
                     if (std == null && chartGroupLabel?.toLowerCase() === 'total') {
                        // Attempt to compute implied standard by aggregating sub-machine targets
                        const targetWord = getKpiPrefix(k.kpi_name) ? null : k.kpi_name.trim().toLowerCase();
                        if (targetWord) {
                            let sum = 0;
                            let found = false;
                            categoryData.forEach(other => {
                               if (other.kpi_id !== k.kpi_id && other.kpi_name.toLowerCase().endsWith(targetWord)) {
                                   if (standards[other.kpi_id] != null) {
                                      sum += standards[other.kpi_id];
                                      found = true;
                                   }
                               }
                            });
                            if (found) std = sum;
                        }
                     }
                     return { ...k, __std: std };
                  }).filter(k => k.__std != null);

                  if (candidateKpis.length === 0) {
                    return (
                      <div className="chart-card" style={{ marginTop: '1.5rem', textAlign: 'center', padding: '3rem 1rem' }}>
                        <h3 className="card-title" style={{ justifyContent: 'center' }}>Cumulative Production Pacing</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No targets defined for these metrics to track pacing.</p>
                      </div>
                    );
                  }
                  
                  const primaryKpi = candidateKpis.find(k => k.kpi_name.toLowerCase().includes('weight') || k.kpi_name.toLowerCase().includes('qty') || k.kpi_name.toLowerCase().includes('orders')) || candidateKpis[0];
                  const seriesData = dailyMatrix.series.find(s => s.kpi_id === primaryKpi.kpi_id);
                  if (!seriesData) return null;
                  
                  const standardVal = primaryKpi.__std;
                  let currentActual = 0;
                  let currentTarget = 0;
                  const pacingData = [];
                  
                  for (let i = 0; i < dailyMatrix.dates.length; i++) {
                     const d = dailyMatrix.dates[i];
                     const val = seriesData.values[i];
                     
                     currentTarget += standardVal;
                     
                     if (val != null && val > 0) {
                        currentActual += val;
                     }
                     
                     const hasFutureData = seriesData.values.slice(i).some(v => v != null && v > 0);
                     
                     pacingData.push({
                        dateLabel: d.slice(8, 10),
                        target: currentTarget,
                        actual: hasFutureData || (val != null && val > 0) ? currentActual : null
                     });
                  }

                  const isGood = currentActual >= currentTarget;
                  
                  return (
                    <div className="chart-card" style={{ marginTop: '1.5rem', paddingBottom: '1rem' }}>
                      <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>
                        Cumulative Production Pacing
                        {chartGroupLabel && <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>· {chartGroupLabel}</span>}
                      </h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                        Tracking month-to-date <strong style={{ color: 'var(--text-main)' }}>{primaryKpi.kpi_name}</strong> progress against target trajectory.
                      </p>

                      <div style={{ height: '350px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={pacingData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                            <defs>
                              <linearGradient id={`colorActual-${primaryKpi.kpi_id}-${selectedSection}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={isGood ? '#10b981' : '#ef4444'} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={isGood ? '#10b981' : '#ef4444'} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.4} />
                            <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                            <YAxis 
                              tickFormatter={(val) => val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}
                              tick={{ fontSize: 11, fill: 'var(--text-muted)' }} 
                              axisLine={false} tickLine={false} 
                            />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', borderRadius: '8px', fontSize: '0.8rem' }}
                              formatter={(value, name) => [value.toLocaleString(undefined, { maximumFractionDigits: 0 }) + (primaryKpi.unit ? ` ${primaryKpi.unit}` : ''), name === 'target' ? 'Target Trajectory' : 'Actual Cumulative']}
                              labelStyle={{ color: 'var(--text-color)', fontWeight: 'bold', marginBottom: '4px' }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                            <Line type="monotone" dataKey="target" stroke="var(--text-muted)" strokeWidth={2} strokeDasharray="5 5" dot={false} name="target" />
                            <Area type="monotone" dataKey="actual" stroke={isGood ? '#10b981' : '#ef4444'} strokeWidth={3} fill={`url(#colorActual-${primaryKpi.kpi_id}-${selectedSection})`} activeDot={{ r: 6 }} name="actual" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                }

                // ── Budget Burn Gauges ────────────────────────────────────────────
                // Semi-circle SVG gauge per KPI. Shows how much of the period
                // budget has been consumed. Green = within budget, Red = over.
                const toRad = deg => deg * Math.PI / 180;
                const gaugeArcPath = (cx, cy, r, pctFill) => {
                  const bgStart = { x: cx - r, y: cy };
                  const bgEnd   = { x: cx + r, y: cy };
                  // sweep-flag = 1 for a top semi-circle (rainbow)
                  const bg = `M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 0 1 ${bgEnd.x} ${bgEnd.y}`;
                  
                  const visualPct = Math.min(pctFill, 100);
                  const fillAngleDeg = 180 - visualPct * 1.8;
                  const fillEndX = cx + r * Math.cos(toRad(fillAngleDeg));
                  const fillEndY = cy - r * Math.sin(toRad(fillAngleDeg));
                  const largeArc = 0; // Always 0 for an arc <= 180 degrees
                  const fill = pctFill > 0
                    ? `M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 ${largeArc} 1 ${fillEndX.toFixed(2)} ${fillEndY.toFixed(2)}`
                    : null;
                  return { bg, fill };
                };

                const gaugeKpis = chartItems.map(ci => {
                  const dev = getDeviation(ci);
                  if (!dev) return null;
                  const pct = ((ci.value / dev.periodStd) * 100);
                  return { kpiInfo: ci, pct, periodStd: dev.periodStd, isGood: dev.isGood };
                }).filter(Boolean);

                const noStdKpis = chartItems.filter(ci => !getDeviation(ci));

                if (gaugeKpis.length === 0 && noStdKpis.length === 0) return null;

                return (
                  <div className="chart-card" style={{ marginTop: '1.5rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h3 className="card-title" style={{ marginBottom: '0.2rem' }}>
                        Budget Utilisation — {selectedSectionName}
                        {chartGroupLabel && <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>· {chartGroupLabel}</span>}
                      </h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                        How much of the period consumption budget has been used so far.
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
                      {gaugeKpis.map(({ kpiInfo, pct, periodStd, isGood }) => {
                        const isOver = pct > 100;
                        const isWarning = pct > 85;
                        
                        const gradId = `gauge-grad-${kpiInfo.kpi_id}-${selectedSection}-${selectedCategory}`;
                        
                        let stopStart, stopEnd;
                        if (isOver) {
                          stopStart = '#f87171'; stopEnd = '#dc2626';
                        } else if (isWarning) {
                          stopStart = '#fbbf24'; stopEnd = '#d97706';
                        } else {
                          stopStart = '#34d399'; stopEnd = '#059669';
                        }

                        const { bg, fill } = gaugeArcPath(50, 50, 40, pct);
                        const diff = Math.abs(kpiInfo.value - periodStd);
                        const fmtNum = v => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0);
                        const diffText = isOver ? `${fmtNum(diff)} ${kpiInfo.unit} over` : `${fmtNum(diff)} ${kpiInfo.unit} left`;
                        
                        return (
                          <div key={kpiInfo.kpi_id} style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            position: 'relative'
                          }} className="card budget-gauge-card">
                            
                            <div style={{ width: '130px', position: 'relative', marginBottom: '0.6rem' }}>
                              <svg viewBox="0 0 100 65" style={{ width: '100%', overflow: 'visible' }}>
                                <defs>
                                  <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor={stopStart} />
                                    <stop offset="100%" stopColor={stopEnd} />
                                  </linearGradient>
                                  <filter id={`glow-${kpiInfo.kpi_id}-${selectedSection}-${selectedCategory}`} x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="3" result="blur" />
                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                  </filter>
                                </defs>
                                <path d={bg} fill="none" stroke="var(--bg-color)" strokeWidth="10" strokeLinecap="round" />
                                {fill && (
                                  <>
                                    <path d={fill} fill="none" stroke={`url(#${gradId})`} strokeWidth="10" strokeLinecap="round" filter={`url(#glow-${kpiInfo.kpi_id}-${selectedSection}-${selectedCategory})`} opacity="0.6" transform="translate(0, 2)" />
                                    <path d={fill} fill="none" stroke={`url(#${gradId})`} strokeWidth="10" strokeLinecap="round" />
                                  </>
                                )}
                                <text x="50" y="46" textAnchor="middle" fontSize="18" fontWeight="800" fill="var(--text-main)">
                                  {pct.toFixed(0)}%
                                </text>
                              </svg>
                            </div>

                            <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-main)', textAlign: 'center', marginBottom: '0.5rem', minHeight: '38px', lineHeight: 1.3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ display: 'inline-block' }}>{kpiInfo.kpi_name}</span>
                            </div>

                            <div style={{
                              fontSize: '0.7rem', fontWeight: 800, borderRadius: '999px',
                              padding: '4px 12px', marginBottom: '1rem',
                              background: isOver ? 'rgba(239, 68, 68, 0.1)' : isWarning ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                              color: isOver ? '#dc2626' : isWarning ? '#d97706' : '#059669',
                              letterSpacing: '0.02em',
                              textTransform: 'uppercase'
                            }}>
                              {diffText}
                            </div>

                            <div style={{ 
                               display: 'flex', justifyContent: 'space-between', width: '100%', 
                               paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.04)',
                               alignItems: 'baseline'
                            }}>
                               <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                 <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Actual</span>
                                 <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>{fmtNum(kpiInfo.value)}<span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: '2px'}}>{kpiInfo.unit}</span></span>
                               </div>
                               <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                                 <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Budget</span>
                                 <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{fmtNum(periodStd)}<span style={{ fontSize: '0.65rem', marginLeft: '2px'}}>{kpiInfo.unit}</span></span>
                               </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* No-standard cards */}
                      {noStdKpis.map(ci => (
                        <div key={ci.kpi_id} style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center',
                          position: 'relative',
                          height: '100%'
                        }} className="card budget-gauge-card no-target-card">
                          <div style={{ width: '130px', marginBottom: '0.6rem', opacity: 0.3 }}>
                            <svg viewBox="0 0 100 65" style={{ width: '100%', overflow: 'visible' }}>
                              <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--border-color)" strokeWidth="10" strokeLinecap="round" strokeDasharray="4 6" />
                            </svg>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '0.5rem', minHeight: '38px', lineHeight: 1.3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ display: 'inline-block' }}>{ci.kpi_name}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--border-color)', padding: '4px 10px', borderRadius: '999px', fontWeight: 600 }}>No Target Set</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </>
      )}


    </div>
  );
};

export default Dashboard;
