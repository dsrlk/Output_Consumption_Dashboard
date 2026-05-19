import React, { useEffect, useState, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, Cell,
  LineChart, Line
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Coins, Package, Zap, 
  Fuel, Droplet, Sparkles, Palette, Users, Percent, Truck, Briefcase,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { getAllRecords, COST_KEYS, computeDelta, fmt2, fmt0, fmtPct, monthLabel } from '../services/api';

const ICON_MAP = {
  electricityCost: Zap,
  dieselCost: Fuel,
  furnaceOilCost: Droplet,
  starchCost: Sparkles,
  inkCost: Palette,
  waterCost: Droplet,
  payrollCost: Users,
  financeCost: Percent,
  depreciation: TrendingDown,
  hiredLorryCost: Truck,
  contractWorkersCost: Briefcase
};

/* ── CountUp Hook ─────────────────────────── */
function useCountUp(target, duration = 800) {
  const [val, setVal] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    if (target == null || isNaN(target)) return;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(target * ease);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return val;
}

/* ── Delta Badge ──────────────────────────── */
function DeltaBadge({ pct, invertGood = false }) {
  if (pct == null) return <span className="metric-delta flat">—</span>;
  const up = pct > 0;
  const good = invertGood ? !up : up;
  return (
    <span className={`metric-delta ${good ? 'good' : 'bad'}`}>
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {fmtPct(pct)} MoM
    </span>
  );
}

/* ── Detail Row ───────────────────────────── */
function DetailRow({ label, val, unit }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0.65rem 0.75rem', border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)', background: 'var(--card)', marginBottom: '0.4rem'
    }}>
      <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
        {val} <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>{unit}</span>
      </span>
    </div>
  );
}

/* ── Drilldown Card ───────────────────────── */
function DrilldownCard({ label, value, unit, color }) {
  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
      padding: '0.75rem 1rem', background: 'var(--card)', position: 'relative',
      overflow: 'hidden', boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: color }} />
      <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2, paddingLeft: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', paddingLeft: 4, display: 'flex', alignItems: 'baseline', gap: 4 }}>
        {value}
        {unit && <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--muted)' }}>{unit}</span>}
      </div>
    </div>
  );
}

/* ── Metric Card ──────────────────────────── */
function MetricCard({ label, value, unit, delta, invertGood, accent, icon: Icon, decimals = 2, isRange, isActive, onClick }) {
  const v = useCountUp(typeof value === 'number' ? value : 0);
  const display = typeof value === 'number' 
    ? decimals === 0 ? fmt0(v) : v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—';

  const isClickable = !!onClick;

  return (
    <div 
      className="card metric-card fade-up"
      onClick={onClick}
      style={{
        cursor: isClickable ? 'pointer' : 'default',
        border: isActive ? `1.8px solid ${accent}` : '1.5px solid var(--border)',
        boxShadow: isActive ? `0 10px 24px -4px ${accent}25` : 'var(--shadow-sm)',
        transform: isActive ? 'translateY(-2px)' : 'none',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative'
      }}
      onMouseEnter={e => { if (isClickable && !isActive) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = accent; } }}
      onMouseLeave={e => { if (isClickable && !isActive) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; } }}
    >
      <div className="metric-accent" style={{ background: accent }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {label}
          </div>
          <div className="metric-value" style={{ color: isActive ? accent : 'var(--text)' }}>{display}</div>
          <div className="metric-unit">{unit}</div>
        </div>
        <div className="metric-icon" style={{ background: accent + '15', color: accent }}>
          <Icon size={18} strokeWidth={2.5} />
        </div>
      </div>
      {!isRange && <DeltaBadge pct={delta} invertGood={invertGood} />}
    </div>
  );
}

/* ── Category KPI Card ────────────────────────── */
function CategoryKPICard({ costObj, value, sharePct = 0, isActive, onClick }) {
  const v = useCountUp(typeof value === 'number' ? value : 0);
  const IconComponent = ICON_MAP[costObj.key] || Zap;

  return (
    <div 
      onClick={onClick}
      style={{
        background: 'var(--card)',
        border: isActive ? `2.2px solid ${costObj.color}` : '1.5px solid var(--border)',
        borderRadius: 'var(--r)',
        padding: '1.4rem 1.4rem 1.2rem',
        cursor: 'pointer',
        userSelect: 'none',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isActive 
          ? `0 12px 28px -4px ${costObj.color}25, 0 4px 10px -2px ${costObj.color}15` 
          : 'var(--shadow-sm)',
        transform: isActive ? 'translateY(-3px)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '140px',
        height: '140px'
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.borderColor = costObj.color;
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = `0 8px 20px -6px ${costObj.color}15`;
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        }
      }}
    >
      {/* Glow accent line at top when active */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '3px',
        background: isActive ? costObj.color : 'transparent',
        transition: 'background 0.3s ease',
        borderRadius: 'var(--r) var(--r) 0 0'
      }} />

      {/* Glow backdrop */}
      {isActive && (
        <div style={{
          position: 'absolute',
          top: -30,
          right: -30,
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: costObj.color,
          opacity: 0.06,
          filter: 'blur(20px)',
          pointerEvents: 'none'
        }} />
      )}

      {/* Top Row: Icon badge + Label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ 
          fontSize: '0.68rem', 
          fontWeight: 800, 
          color: isActive ? 'var(--text)' : 'var(--muted)', 
          textTransform: 'uppercase', 
          letterSpacing: '0.06em',
          lineHeight: 1.2
        }}>
          {costObj.label}
        </span>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          borderRadius: '10px',
          background: isActive ? `${costObj.color}15` : 'rgba(0,0,0,0.03)',
          color: isActive ? costObj.color : 'var(--muted)',
          transition: 'all 0.3s ease',
          flexShrink: 0
        }}>
          <IconComponent size={16} strokeWidth={2.2} />
        </div>
      </div>

      {/* Big Value */}
      <div style={{ 
        fontSize: '2.2rem', 
        fontWeight: 900, 
        color: 'var(--text)', 
        letterSpacing: '-0.03em',
        lineHeight: 1,
        display: 'flex',
        alignItems: 'baseline',
        gap: '0.25rem'
      }}>
        {costObj.key === 'hiredLorryCost' && value > 1000 ? fmt0(v) : fmt2(v)}
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)', letterSpacing: 0 }}>LKR/kg</span>
      </div>

      {/* Bottom: Share bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
          <span>Category Share</span>
          <span style={{ color: isActive ? costObj.color : 'var(--text)', fontWeight: 800, fontSize: '0.65rem' }}>{sharePct.toFixed(1)}%</span>
        </div>
        <div style={{ height: 5, width: '100%', background: 'rgba(0,0,0,0.05)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ 
            height: '100%', 
            width: `${Math.min(sharePct, 100)}%`, 
            background: `linear-gradient(90deg, ${costObj.color}cc, ${costObj.color})`,
            borderRadius: 3,
            transition: 'width 0.9s cubic-bezier(0.4, 0, 0.2, 1)'
          }} />
        </div>
      </div>
    </div>
  );
}

/* ── Custom Tooltip ───────────────────────── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)', padding: '0.75rem 1rem', fontSize: '0.77rem',
      boxShadow: 'var(--shadow-md)', minWidth: 160
    }}>
      <div style={{ color: 'var(--text)', marginBottom: 6, fontWeight: 700 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
          <span style={{ color: p.color || 'var(--muted)', fontWeight: 600 }}>{p.name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)', fontWeight: 600 }}>
            {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Custom Styled Dropdown ───────────────── */
function CustomDropdown({ value, options, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: 'var(--card)',
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--r-sm)',
          padding: '0.35rem 0.6rem',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'var(--text)',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all 0.2s ease',
          minWidth: '70px',
          justifyContent: 'space-between',
          outline: 'none'
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--indigo)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        <span>{selectedOption ? selectedOption.label : ''}</span>
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{ 
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            opacity: 0.7
          }}
        >
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>

      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 1000,
            minWidth: '100%',
            background: 'var(--card)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)',
            boxShadow: 'var(--shadow-lg)',
            padding: '4px',
            maxHeight: '220px',
            overflowY: 'auto',
            animation: 'fadeInUp 0.15s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}
        >
          {options.map(opt => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: isSelected ? 'rgba(198, 40, 40, 0.05)' : 'transparent',
                  color: isSelected ? 'var(--indigo)' : 'var(--text)',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.4rem 0.6rem',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'block'
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'rgba(41, 37, 36, 0.05)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const SUB_COMPONENTS_MAP = {
  electricityCost: [
    { key: 'Cost / kg', label: 'Electricity cost/Kg', unit: 'LKR / kg', type: 'average', color: '#3b82f6' },
    { key: 'elecUnits', label: 'Units consumed', unit: 'kWh', type: 'sum', color: '#06b6d4' },
    { key: 'elecRate', label: 'Unit Rate', unit: 'LKR / kWh', type: 'average', color: '#f59e0b' },
    { key: 'elecRawCost', label: 'Cost of Electricity (Total)', unit: 'LKR', type: 'sum', color: '#10b981' }
  ],
  furnaceOilCost: [
    { key: 'Cost / kg', label: 'FO Cost per KG', unit: 'LKR / kg', type: 'average', color: '#f97316' },
    { key: 'foLiters', label: 'Furnace oil Liters', unit: 'Liters', type: 'sum', color: '#ef4444' },
    { key: 'foPrice', label: 'Price / Liter', unit: 'LKR / Liter', type: 'average', color: '#06b6d4' },
    { key: 'foLtrsPerTon', label: 'Furnace Ltrs / Ton', unit: 'Liters / MT', type: 'average', color: '#8b5cf6' }
  ],
  starchCost: [
    { key: 'Cost / kg', label: 'Glue Cost per KG', unit: 'LKR / kg', type: 'average', color: '#8b5cf6' },
    { key: 'starchRawKgs', label: 'Starch Consumption (kgs)', unit: 'kgs', type: 'sum', color: '#ec4899' },
    { key: 'starchPrice', label: 'Price / kg', unit: 'LKR / kg', type: 'average', color: '#10b981' },
    { key: 'starchDensity', label: 'Starch cons kgs / Ton', unit: 'kg / MT', type: 'average', color: '#f59e0b' }
  ],
  inkCost: [
    { key: 'Cost / kg', label: 'Ink Cost per KG', unit: 'LKR / kg', type: 'average', color: '#ec4899' },
    { key: 'inkRawKgs', label: 'Ink Consumption (kgs)', unit: 'kgs', type: 'sum', color: '#06b6d4' },
    { key: 'inkPrice', label: 'Price / kg', unit: 'LKR / kg', type: 'average', color: '#8b5cf6' },
    { key: 'inkDensity', label: 'Ink cons kgs / Ton', unit: 'kg / MT', type: 'average', color: '#f59e0b' }
  ],
  waterCost: [
    { key: 'Cost / kg', label: 'Water Cost per KG', unit: 'LKR / kg', type: 'average', color: '#06b6d4' },
    { key: 'waterRawCost', label: 'Water Consumption cost (Total)', unit: 'LKR', type: 'sum', color: '#6366f1' },
    { key: 'waterUnits', label: 'Water Units', unit: 'Units', type: 'sum', color: '#14b8a6' },
    { key: 'waterRate', label: 'Water cost Rs / Unit', unit: 'LKR / Unit', type: 'average', color: '#f97316' }
  ],
  dieselCost: [
    { key: 'Cost / kg', label: 'Diesel Cost per KG', unit: 'LKR / kg', type: 'average', color: '#ef4444' },
    { key: 'dieselRawCost', label: 'Diesel Consumption cost (Total)', unit: 'LKR', type: 'sum', color: '#10b981' },
    { key: 'dieselPrice', label: 'Diesel Price / Liter', unit: 'LKR / Liter', type: 'average', color: '#f59e0b' }
  ],
  payrollCost: [
    { key: 'Cost / kg', label: 'Payroll Exp /Kg', unit: 'LKR / kg', type: 'average', color: '#10b981' },
    { key: 'payrollRawLkr', label: 'Payroll LKR (Total)', unit: 'LKR', type: 'sum', color: '#6366f1' },
    { key: 'payrollEmployees', label: 'No of Employees', unit: 'Staff', type: 'average', color: '#06b6d4' }
  ],
  financeCost: [
    { key: 'Cost / kg', label: 'Finance Cost /Kg', unit: 'LKR / kg', type: 'average', color: '#6366f1' },
    { key: 'financeRawLkr', label: 'Finance Cost (Total)', unit: 'LKR', type: 'sum', color: '#ec4899' }
  ],
  depreciation: [
    { key: 'Cost / kg', label: 'Depreciation Cost /kg', unit: 'LKR / kg', type: 'average', color: '#8b5cf6' },
    { key: 'deprecRawLkr', label: 'Depreciation Cost (Total)', unit: 'LKR', type: 'sum', color: '#f97316' }
  ],
  hiredLorryCost: [
    { key: 'Cost / kg', label: 'Hired Lorry Cost /kg', unit: 'LKR / kg', type: 'average', color: '#f59e0b' },
    { key: 'hiredLorryRawLkr', label: 'Hired Lorry Cost (Total)', unit: 'LKR', type: 'sum', color: '#ef4444' },
    { key: 'hiredLorryCostPerTon', label: 'Hire Cost / Ton', unit: 'LKR / MT', type: 'average', color: '#8b5cf6' }
  ],
  contractWorkersCost: [
    { key: 'Cost / kg', label: 'Contract Workers Cost /Kg', unit: 'LKR / kg', type: 'average', color: '#14b8a6' },
    { key: 'contractRawLkr', label: 'Contract Workers Cost (Total)', unit: 'LKR', type: 'sum', color: '#ec4899' }
  ],
  sellingRatePerKg: [
    { key: 'Cost / kg', label: 'Selling Rate', unit: 'LKR / kg', type: 'average', color: '#0ea5e9' }
  ],
  paperCostPerKg: [
    { key: 'Cost / kg', label: 'Paper Cost', unit: 'LKR / kg', type: 'average', color: '#f59e0b' }
  ],
  contributionPerKg: [
    { key: 'Cost / kg', label: 'Contribution', unit: 'LKR / kg', type: 'average', color: '#10b981' }
  ],
  exchangeRate: [
    { key: 'Cost / kg', label: 'Exchange Rate', unit: 'LKR / USD', type: 'average', color: '#f43f5e' }
  ],
  totalOverheadPerKg: [
    { key: 'Cost / kg', label: 'Total Overhead', unit: 'LKR / kg', type: 'average', color: '#6366f1' }
  ],
  totalOverheadSpend: [
    { key: 'Cost / kg', label: 'Total Overhead Spend', unit: 'LKR', type: 'sum', color: '#10b981' }
  ],
  totalTonnage: [
    { key: 'Cost / kg', label: 'Total Tonnage', unit: 'MT', type: 'sum', color: '#f59e0b' }
  ]
};

const MACRO_KEYS = [
  { key: 'sellingRatePerKg',  label: 'Selling Rate',      color: '#0ea5e9' },
  { key: 'paperCostPerKg',    label: 'Paper Cost',        color: '#f59e0b' },
  { key: 'contributionPerKg', label: 'Contribution',       color: '#10b981' },
  { key: 'exchangeRate',      label: 'Exchange Rate',     color: '#f43f5e' },
  { key: 'totalOverheadPerKg',label: 'Total Overhead',    color: '#6366f1' },
  { key: 'totalOverheadSpend',label: 'Total Overhead Spend', color: '#10b981' },
  { key: 'totalTonnage',      label: 'Total Tonnage',      color: '#f59e0b' }
];

/* ── Dashboard Page ───────────────────────── */
export default function Dashboard() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(0);
  const [activeDetailCost, setActiveDetailCost] = useState(null);
  const [selectedSubComponentKey, setSelectedSubComponentKey] = useState('Cost / kg');
  const [activeGroup, setActiveGroup] = useState('ALL');
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const cardListRef = useRef(null);
  const analyzerRef = useRef(null);

  const KPI_GROUPS = {
    ALL: { label: 'All Categories', keys: null },
    ENERGY: { label: 'Energy & Utilities', keys: ['electricityCost', 'dieselCost', 'furnaceOilCost', 'waterCost'] },
    MATERIALS: { label: 'Raw Materials & Ink', keys: ['starchCost', 'inkCost'] },
    LABOR: { label: 'Labor & Services', keys: ['payrollCost', 'contractWorkersCost'] },
    FINANCE: { label: 'Finance & Logistics', keys: ['financeCost', 'depreciation', 'hiredLorryCost'] }
  };

  useEffect(() => {
    setSelectedSubComponentKey('Cost / kg');
  }, [activeDetailCost]);

  // Update scroll arrow visibility whenever group or records change
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = cardListRef.current;
      if (!el) return;
      const update = () => {
        setCanScrollLeft(el.scrollLeft > 5);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5);
      };
      update();
      el.addEventListener('scroll', update, { passive: true });
      return () => el.removeEventListener('scroll', update);
    }, 120);
    return () => clearTimeout(timer);
  }, [activeGroup, records]);

  // Auto-scroll page to analyzer drawer when a card is clicked
  useEffect(() => {
    if (activeDetailCost && analyzerRef.current) {
      const timer = setTimeout(() => {
        analyzerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeDetailCost]);

  useEffect(() => {
    getAllRecords().then(data => {
      setRecords(data);
      if (data.length > 0) {
        setRangeEnd(data.length - 1);
        setRangeStart(Math.max(0, data.length - 6)); // Default 6 months
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 160, marginBottom: '2rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 140 }} />)}
        </div>
      </div>
    );
  }

  if (!records.length) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ fontSize: '3rem', opacity: 0.5, marginBottom: '1rem', filter: 'grayscale(1)' }}>📊</div>
        <h2 style={{ marginBottom: '0.5rem' }}>No Data Available</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>Upload the Excel file via Data Hub to view metrics.</p>
        <a href="/data-hub" className="btn btn-primary">Go to Data Hub</a>
      </div>
    );
  }

  // Enforce valid range
  const actualStart = Math.min(rangeStart, rangeEnd);
  const actualEnd = Math.max(rangeStart, rangeEnd);
  const isRange = actualStart !== actualEnd;

  const getMonthAndYear = (index) => {
    const r = records[index];
    if (!r) return { month: '01', year: '' };
    const [y, m] = r.monthKey.split('-');
    return { month: m, year: y };
  };

  const handleStartMonthChange = (newMonth) => {
    const { year } = getMonthAndYear(actualStart);
    const key = `${year}-${newMonth}`;
    const idx = records.findIndex(r => r.monthKey === key);
    if (idx !== -1) setRangeStart(idx);
  };

  const handleStartYearChange = (newYear) => {
    const { month } = getMonthAndYear(actualStart);
    const key = `${newYear}-${month}`;
    let idx = records.findIndex(r => r.monthKey === key);
    if (idx === -1) {
      idx = records.findIndex(r => r.monthKey.startsWith(newYear));
    }
    if (idx !== -1) setRangeStart(idx);
  };

  const handleEndMonthChange = (newMonth) => {
    const { year } = getMonthAndYear(actualEnd);
    const key = `${year}-${newMonth}`;
    const idx = records.findIndex(r => r.monthKey === key);
    if (idx !== -1) setRangeEnd(idx);
  };

  const handleEndYearChange = (newYear) => {
    const { month } = getMonthAndYear(actualEnd);
    const key = `${newYear}-${month}`;
    let idx = records.findIndex(r => r.monthKey === key);
    if (idx === -1) {
      const yearRecs = records.filter(r => r.monthKey.startsWith(newYear));
      if (yearRecs.length > 0) {
        const lastMonthKey = yearRecs[yearRecs.length - 1].monthKey;
        idx = records.findIndex(r => r.monthKey === lastMonthKey);
      }
    }
    if (idx !== -1) setRangeEnd(idx);
  };

  const startVal = getMonthAndYear(actualStart);
  const endVal = getMonthAndYear(actualEnd);

  const availableYears = Array.from(new Set(records.map(r => r.monthKey.split('-')[0]))).sort();
  
  const getAvailableMonthsForYear = (year) => {
    return records
      .filter(r => r.monthKey.startsWith(year))
      .map(r => r.monthKey.split('-')[1])
      .sort();
  };

  const monthsMap = {
    '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun',
    '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
  };

  const slice = records.slice(actualStart, actualEnd + 1);
  
  // Aggregate records
  const rec = { 
    monthKey: isRange 
      ? `${monthLabel(records[actualStart].monthKey)} – ${monthLabel(records[actualEnd].monthKey)}` 
      : monthLabel(records[actualEnd].monthKey) 
  };
  
  // Sum tonnage, average rates
  rec.tonnage = slice.reduce((sum, r) => sum + (r.tonnage || 0), 0);
  
  const avgKeys = [
    'exchangeRate', 'sellingRatePerKg', 'paperCostPerKg', 'contributionPerKg', 'totalOverheadPerKg', 'electricityCost',
    'elecRate', 'starchPrice', 'starchDensity',
    'inkPrice', 'inkDensity', 'waterRate', 'dieselPrice', 'payrollEmployees',
    ...COST_KEYS.map(k=>k.key)
  ];
  avgKeys.forEach(k => {
    const sum = slice.reduce((s, r) => s + (r[k] || 0), 0);
    rec[k] = sum / slice.length;
  });

  const sumKeys = [
    'elecRawCost', 'elecUnits',
    'starchRawKgs', 'inkRawKgs',
    'waterRawCost', 'waterUnits',
    'dieselRawCost', 'payrollRawLkr',
    'financeRawLkr', 'deprecRawLkr', 'contractRawLkr', 'hiredLorryRawLkr'
  ];
  sumKeys.forEach(k => {
    rec[k] = slice.reduce((s, r) => s + (r[k] || 0), 0);
  });

  const delta = (k) => isRange ? null : computeDelta(records, k, actualEnd);

  // All active overhead cost drivers
  const topCosts = COST_KEYS
    .map(k => ({ ...k, value: rec[k.key] || 0 }))
    .filter(k => k.value > 0)
    .sort((a, b) => b.value - a.value);
  const totalOH = rec.totalOverheadPerKg || 1;

  // Trend Data (based on range)
  const trendData = slice.map(r => ({
    name: monthLabel(r.monthKey),
    totalOverhead: r.totalOverheadPerKg,
    contribution: r.contributionPerKg
  }));

  const totalSpend = slice.reduce((s, r) => s + (r.totalOverheadPerKg || 0) * (r.tonnage || 0) * 1000, 0);

  const activeCostObj = COST_KEYS.find(o => o.key === activeDetailCost) || MACRO_KEYS.find(o => o.key === activeDetailCost) || null;

  const availableSubComponents = activeCostObj ? (SUB_COMPONENTS_MAP[activeDetailCost] || [
    { key: 'Cost / kg', label: `${activeCostObj.label} Cost /kg`, unit: 'LKR / kg', type: 'average', color: activeCostObj.color }
  ]) : [];

  const activeSubObj = activeCostObj ? (availableSubComponents.find(c => c.key === selectedSubComponentKey) || availableSubComponents[0]) : null;

  const subValue = activeSubObj ? (() => {
    let key = activeSubObj.key;
    if (key === 'Cost / kg') key = activeDetailCost;
    
    const sumKeys = ['elecUnits', 'elecRawCost', 'foLiters', 'foCostPerKg', 'starchRawKgs', 'inkRawKgs', 'waterUnits', 'waterRawCost', 'dieselRawCost', 'payrollRawLkr', 'financeRawLkr', 'deprecRawLkr', 'hiredLorryRawLkr', 'contractRawLkr', 'wastePaperCostRs', 'wasteSavingsKg', 'totalOverheadSpend', 'totalTonnage'];
    const isSum = activeSubObj.type === 'sum' || sumKeys.includes(key);

    if (key === 'totalOverheadSpend') return totalSpend;
    if (key === 'totalTonnage') return rec.tonnage;

    const sum = slice.reduce((s, r) => s + (r[key] || 0), 0);
    return isSum ? sum : (sum / slice.length);
  })() : 0;

  const isMacro = activeCostObj ? MACRO_KEYS.some(m => m.key === activeCostObj.key) : false;
  let primaryLabel = activeCostObj ? `${activeCostObj.label} Category Spend` : '';
  let primaryVal = activeCostObj ? `LKR ${fmt0((rec[activeCostObj.key] || 0) * 1000 * rec.tonnage)}` : '';

  if (activeCostObj && isMacro) {
    if (activeCostObj.key === 'sellingRatePerKg') {
      primaryLabel = 'Total Sales Revenue';
      primaryVal = `LKR ${fmt0(rec.sellingRatePerKg * 1000 * rec.tonnage)}`;
    } else if (activeCostObj.key === 'paperCostPerKg') {
      primaryLabel = 'Total Paper Cost';
      primaryVal = `LKR ${fmt0(rec.paperCostPerKg * 1000 * rec.tonnage)}`;
    } else if (activeCostObj.key === 'contributionPerKg') {
      primaryLabel = 'Total Contribution Margin';
      primaryVal = `LKR ${fmt0(rec.contributionPerKg * 1000 * rec.tonnage)}`;
    } else if (activeCostObj.key === 'exchangeRate') {
      primaryLabel = 'Average Exchange Rate';
      primaryVal = `${fmt2(rec.exchangeRate)} LKR/USD`;
    } else if (activeCostObj.key === 'totalOverheadPerKg') {
      primaryLabel = 'Total Overhead Spend';
      primaryVal = `LKR ${fmt0(totalSpend)}`;
    } else if (activeCostObj.key === 'totalOverheadSpend') {
      primaryLabel = 'Average Overhead Rate';
      primaryVal = `${fmt2(rec.totalOverheadPerKg)} LKR/kg`;
    } else if (activeCostObj.key === 'totalTonnage') {
      primaryLabel = 'Total Overhead Spend';
      primaryVal = `LKR ${fmt0(totalSpend)}`;
    }
  }

  const drilldownChartData = activeSubObj ? slice.map(r => {
    let key = activeSubObj.key;
    if (key === 'Cost / kg') key = activeDetailCost;
    
    let val = r[key] || 0;
    if (key === 'totalOverheadSpend') {
      val = (r.totalOverheadPerKg || 0) * (r.tonnage || 0) * 1000;
    } else if (key === 'totalTonnage') {
      val = r.tonnage || 0;
    }

    return {
      name: monthLabel(r.monthKey),
      [activeSubObj.label]: val
    };
  }) : [];


  const handleScroll = (direction) => {
    const container = cardListRef.current;
    if (container) {
      const scrollAmount = 356; // width of card (340) + gap (16)
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  const isMacroActive = activeDetailCost && MACRO_KEYS.some(m => m.key === activeDetailCost);

  const renderAnalyzer = () => {
    if (!activeCostObj) return null;
    return (
      <div 
        ref={analyzerRef}
        style={{
          maxHeight: activeCostObj ? '800px' : '0px',
          opacity: activeCostObj ? 1 : 0,
          overflow: 'hidden',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          marginBottom: activeCostObj ? '1.5rem' : '0rem',
          marginTop: activeCostObj ? '1rem' : '0rem',
          transform: activeCostObj ? 'translateY(0)' : 'translateY(-10px)'
        }}
      >
        <div className="card card-pad" style={{ border: `1.8px solid ${activeCostObj.color}`, boxShadow: `0 8px 30px ${activeCostObj.color}15`, background: 'var(--card)' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: activeCostObj.color }} />
                <span>{activeCostObj.label} Analyzer</span>
              </div>
              <div className="hero-divider" style={{ height: 20, margin: '0 0.5rem', background: 'var(--border)' }} />
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Period Summary ({isRange ? `${monthsMap[startVal.month]} ${startVal.year} – ${monthsMap[endVal.month]} ${endVal.year}` : `${monthsMap[startVal.month]} ${startVal.year}`})
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {availableSubComponents.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)' }}>Detailed Component:</span>
                  <CustomDropdown
                    value={selectedSubComponentKey}
                    options={availableSubComponents.map(c => ({ value: c.key, label: c.label }))}
                    onChange={(val) => setSelectedSubComponentKey(val)}
                  />
                </div>
              )}

              <span className="tag tag-indigo" style={{ fontSize: '0.68rem', fontWeight: 700, color: activeCostObj.color, background: `${activeCostObj.color}12`, border: `1px solid ${activeCostObj.color}25` }}>
                {isRange ? `${actualEnd - actualStart + 1} Months` : '1 Month'}
              </span>

              <button 
                onClick={() => setActiveDetailCost(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
              >
                Close &times;
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginTop: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--r-md)', padding: '1.25rem', background: 'var(--card-alt)', boxShadow: 'var(--shadow-sm)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: activeSubObj.color }} />
                <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  {activeSubObj.type === 'sum' ? 'Aggregated Sum' : 'Period Average'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text)', fontWeight: 700, marginBottom: 8 }}>
                  {activeSubObj.label}
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                  {(activeSubObj.key === 'Cost / kg' || activeSubObj.key.toLowerCase().includes('rate') || activeSubObj.key.toLowerCase().includes('price') || activeSubObj.key.toLowerCase().includes('density') || activeSubObj.key.toLowerCase().includes('costperkg')) && activeDetailCost !== 'totalTonnage' && activeDetailCost !== 'totalOverheadSpend'
                    ? fmt2(subValue) 
                    : fmt0(subValue)
                  }
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)' }}>{activeSubObj.unit}</span>
                </div>
              </div>

              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '0.75rem 1rem', background: 'var(--card-alt)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{primaryLabel}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: activeCostObj.color }}>{primaryVal}</div>
              </div>

              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '0.75rem 1rem', background: 'var(--card-alt)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Total Tonnage</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>{fmt0(rec.tonnage)} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--muted)' }}>MT</span></div>
              </div>
            </div>

            <div style={{ background: 'var(--card-alt)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {activeSubObj.label} Historical Trend
                </div>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: activeCostObj.color, 
                  fontWeight: 800, 
                  background: 'rgba(255,255,255,0.03)', 
                  padding: '0.25rem 0.65rem', 
                  borderRadius: 'var(--r-sm)', 
                  border: `1.5px solid ${activeCostObj.color}25`,
                  backdropFilter: 'blur(8px)',
                  boxShadow: 'var(--shadow-sm)',
                  letterSpacing: '-0.01em'
                }}>
                  Topic: {
                    activeDetailCost === 'totalOverheadPerKg' ? 'Overhead Rate Performance Trend' :
                    activeDetailCost === 'totalOverheadSpend' ? 'Overhead Cash Outflow Analysis' :
                    activeDetailCost === 'totalTonnage' ? 'Production Output Volume Trajectory' :
                    `${activeCostObj.label} Cost Drivers`
                  } ({isRange ? `${actualEnd - actualStart + 1} Months` : '1 Month'})
                </div>
              </div>
              <div style={{ flex: 1, height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={drilldownChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#78716c' }} 
                      axisLine={false} 
                      tickLine={false}
                      width={45}
                      tickFormatter={(v) => {
                        if (v >= 1000000) return `${(v / 1000000).toFixed(0)}M`;
                        if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
                        return v;
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '0.72rem', paddingTop: 10 }} iconType="circle" iconSize={6} />
                    <Line
                      type="monotone"
                      dataKey={activeSubObj.label}
                      name={activeSubObj.label}
                      stroke={activeSubObj.color}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      {/* ── Page Hero ───────────────────────── */}
      <div className="page-hero fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2.5rem 2.5rem', minHeight: '160px' }}>
        <div className="page-hero-grid" />
        <div className="hero-left">
          <div className="hero-eyebrow">Financial Dashboard</div>
          <h1 className="hero-title">Overhead Summary</h1>
        </div>
        <div className="hero-right" style={{ alignItems: 'center', gap: '0.5rem' }}>
          <div 
            className="hero-kpi" 
            onClick={() => setActiveDetailCost(activeDetailCost === 'sellingRatePerKg' ? null : 'sellingRatePerKg')}
            style={{ 
              cursor: 'pointer',
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--r-sm)',
              background: activeDetailCost === 'sellingRatePerKg' ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: activeDetailCost === 'sellingRatePerKg' ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseEnter={e => { if (activeDetailCost !== 'sellingRatePerKg') e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { if (activeDetailCost !== 'sellingRatePerKg') e.currentTarget.style.background = 'transparent'; }}
          >
            <div className="hero-kpi-label">{isRange ? 'Avg Selling Rate' : 'Selling Rate'}</div>
            <div className="hero-kpi-val" style={{ color: activeDetailCost === 'sellingRatePerKg' ? 'var(--sky)' : '#ffffff' }}>{fmt2(rec.sellingRatePerKg)}</div>
            <div className="hero-kpi-unit">LKR / kg</div>
          </div>
          <div className="hero-divider" />
          <div 
            className="hero-kpi" 
            onClick={() => setActiveDetailCost(activeDetailCost === 'paperCostPerKg' ? null : 'paperCostPerKg')}
            style={{ 
              cursor: 'pointer',
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--r-sm)',
              background: activeDetailCost === 'paperCostPerKg' ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: activeDetailCost === 'paperCostPerKg' ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseEnter={e => { if (activeDetailCost !== 'paperCostPerKg') e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { if (activeDetailCost !== 'paperCostPerKg') e.currentTarget.style.background = 'transparent'; }}
          >
            <div className="hero-kpi-label">{isRange ? 'Avg Paper Cost' : 'Paper Cost'}</div>
            <div className="hero-kpi-val" style={{ color: activeDetailCost === 'paperCostPerKg' ? 'var(--amber)' : '#ffffff' }}>{fmt2(rec.paperCostPerKg)}</div>
            <div className="hero-kpi-unit">LKR / kg</div>
          </div>
          <div className="hero-divider" />
          <div 
            className="hero-kpi" 
            onClick={() => setActiveDetailCost(activeDetailCost === 'contributionPerKg' ? null : 'contributionPerKg')}
            style={{ 
              cursor: 'pointer',
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--r-sm)',
              background: activeDetailCost === 'contributionPerKg' ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: activeDetailCost === 'contributionPerKg' ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseEnter={e => { if (activeDetailCost !== 'contributionPerKg') e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { if (activeDetailCost !== 'contributionPerKg') e.currentTarget.style.background = 'transparent'; }}
          >
            <div className="hero-kpi-label">{isRange ? 'Avg Contribution' : 'Contribution'}</div>
            <div className="hero-kpi-val" style={{ color: activeDetailCost === 'contributionPerKg' ? 'var(--green)' : '#ffffff' }}>{fmt2(rec.contributionPerKg)}</div>
            <div className="hero-kpi-unit">LKR / kg</div>
          </div>
          <div className="hero-divider" />
          <div 
            className="hero-kpi" 
            onClick={() => setActiveDetailCost(activeDetailCost === 'exchangeRate' ? null : 'exchangeRate')}
            style={{ 
              cursor: 'pointer',
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--r-sm)',
              background: activeDetailCost === 'exchangeRate' ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: activeDetailCost === 'exchangeRate' ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseEnter={e => { if (activeDetailCost !== 'exchangeRate') e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { if (activeDetailCost !== 'exchangeRate') e.currentTarget.style.background = 'transparent'; }}
          >
            <div className="hero-kpi-label">{isRange ? 'Avg Exchange Rate' : 'Exchange Rate'}</div>
            <div className="hero-kpi-val" style={{ color: activeDetailCost === 'exchangeRate' ? '#f43f5e' : 'var(--amber)' }}>{rec.exchangeRate ? fmt2(rec.exchangeRate) : '—'}</div>
            <div className="hero-kpi-unit">LKR / USD</div>
          </div>
        </div>
      </div>

      {/* ── Date Range Selector ───────────────── */}
      <div className="card fade-up" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap', position: 'relative', zIndex: 10 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 90 }}>
          Date Range
        </div>
        
        <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0 0.5rem' }}>
          <Slider 
            range 
            min={0} 
            max={Math.max(0, records.length - 1)} 
            value={[actualStart, actualEnd]} 
            onChange={(val) => { setRangeStart(val[0]); setRangeEnd(val[1]); }}
            allowCross={false}
            trackStyle={[{ backgroundColor: 'var(--indigo)', height: 6 }]}
            handleStyle={[
              { borderColor: 'var(--indigo)', height: 18, width: 18, marginTop: -6, backgroundColor: '#fff', opacity: 1, boxShadow: 'var(--shadow-md)', cursor: 'grab' },
              { borderColor: 'var(--indigo)', height: 18, width: 18, marginTop: -6, backgroundColor: '#fff', opacity: 1, boxShadow: 'var(--shadow-md)', cursor: 'grab' }
            ]}
            railStyle={{ backgroundColor: 'var(--border)', height: 6 }}
            activeDotStyle={{ borderColor: 'var(--indigo)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', gap: '1.5rem', flexWrap: 'wrap' }}>
            {/* Start Period */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', marginRight: '0.2rem' }}>From:</span>
              <CustomDropdown 
                value={startVal.month} 
                options={getAvailableMonthsForYear(startVal.year).map(m => ({ value: m, label: monthsMap[m] }))}
                onChange={handleStartMonthChange}
              />
              <CustomDropdown 
                value={startVal.year} 
                options={availableYears.map(y => ({ value: y, label: String(y) }))}
                onChange={handleStartYearChange}
              />
            </div>

            {/* End Period */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', marginRight: '0.2rem' }}>To:</span>
              <CustomDropdown 
                value={endVal.month} 
                options={getAvailableMonthsForYear(endVal.year).map(m => ({ value: m, label: monthsMap[m] }))}
                onChange={handleEndMonthChange}
              />
              <CustomDropdown 
                value={endVal.year} 
                options={availableYears.map(y => ({ value: y, label: String(y) }))}
                onChange={handleEndYearChange}
              />
            </div>
          </div>
        </div>

        {isRange && (
          <span className="tag tag-indigo" style={{ marginLeft: 'auto', flexShrink: 0 }}>
            {actualEnd - actualStart + 1} Months Selected
          </span>
        )}
      </div>

      {/* ── Core Macro KPIs Header ─────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
        <div style={{ width: 4, height: 16, borderRadius: 2, background: 'var(--indigo)' }} />
        <span style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
          Core Macro KPIs
        </span>
        <span className="tag tag-indigo" style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
          Click card to drill down
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <MetricCard
          label={isRange ? "Avg Total Overhead" : "Total Overhead"} value={rec.totalOverheadPerKg} unit="LKR / kg"
          delta={delta('totalOverheadPerKg')} invertGood={true}
          accent="var(--indigo)" icon={Coins} isRange={isRange}
          isActive={activeDetailCost === 'totalOverheadPerKg'}
          onClick={() => setActiveDetailCost(activeDetailCost === 'totalOverheadPerKg' ? null : 'totalOverheadPerKg')}
        />
        <MetricCard
          label={isRange ? "Total Tonnage" : "Tonnage"} value={rec.tonnage} unit="Metric Tons"
          delta={delta('tonnage')} invertGood={false}
          accent="var(--amber)" icon={Package} decimals={0} isRange={isRange}
          isActive={activeDetailCost === 'totalTonnage'}
          onClick={() => setActiveDetailCost(activeDetailCost === 'totalTonnage' ? null : 'totalTonnage')}
        />
        <MetricCard
          label={isRange ? "Total Overhead Spend" : "Overhead Spend"} 
          value={totalSpend / 1000000} 
          unit="Million LKR"
          delta={null} 
          invertGood={true}
          accent="var(--emerald)" 
          icon={Coins} 
          decimals={2} 
          isRange={isRange}
          isActive={activeDetailCost === 'totalOverheadSpend'}
          onClick={() => setActiveDetailCost(activeDetailCost === 'totalOverheadSpend' ? null : 'totalOverheadSpend')}
        />
      </div>

      {isMacroActive && renderAnalyzer()}

      {/* ── Cost Category KPIs Grid ─────────── */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: 4, height: 16, borderRadius: 2, background: 'var(--indigo)' }} />
            <span style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              Cost Category KPIs
            </span>
            <span className="tag tag-indigo" style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
              Click card to drill down
            </span>
          </div>

          {/* Right side: Group pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Group Pill Filter */}
            <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '2px' }}>
              {Object.entries(KPI_GROUPS).map(([key, group]) => {
                const isActive = activeGroup === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setActiveGroup(key);
                      if (cardListRef.current) cardListRef.current.scrollLeft = 0;
                    }}
                    style={{
                      background: isActive ? 'var(--text)' : 'var(--card)',
                      color: isActive ? 'var(--bg)' : 'var(--muted)',
                      border: isActive ? '1px solid var(--text)' : '1px solid var(--border)',
                      borderRadius: '99px',
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = 'var(--text)'; e.currentTarget.style.color = 'var(--text)'; } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; } }}
                  >
                    {group.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Scrollable Single Row of Cost Category Cards Container with Arrows */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '0.85rem' }}>
          {/* Left Circular Overlay Navigation Arrow */}
          {canScrollLeft && (
            <button
              onClick={() => handleScroll('left')}
              className="carousel-nav-btn"
              style={{
                position: 'absolute',
                left: '-20px',
                zIndex: 10,
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: '#ffffff',
                border: '1.5px solid var(--border)',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text)',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.08)';
                e.currentTarget.style.borderColor = 'var(--text)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
          )}

          {/* Scrollable Cards Row */}
          <div 
            ref={cardListRef}
            className="hide-scrollbar"
            style={{ 
              display: 'flex', 
              gap: '1rem', 
              overflowX: 'auto', 
              width: '100%',
              paddingBottom: '0.75rem',
              paddingTop: '0.25rem',
              paddingLeft: '0.25rem',
              paddingRight: '0.25rem',
              scrollBehavior: 'smooth',
              marginBottom: '0.25rem'
            }}
          >
            {COST_KEYS.filter(k => {
              const groupKeys = KPI_GROUPS[activeGroup].keys;
              return !groupKeys || groupKeys.includes(k.key);
            })
            .map(k => {
              const sharePct = ((rec[k.key] || 0) / (rec.totalOverheadPerKg || 1)) * 100;
              return { k, sharePct };
            })
            .sort((a, b) => b.sharePct - a.sharePct)
            .map(({ k, sharePct }) => {
              return (
                <div key={k.key} style={{ flexShrink: 0, width: '340px' }}>
                  <CategoryKPICard
                    costObj={k}
                    value={rec[k.key] || 0}
                    sharePct={sharePct}
                    isActive={activeDetailCost === k.key}
                    onClick={() => setActiveDetailCost(activeDetailCost === k.key ? null : k.key)}
                  />
                </div>
              );
            })}
          </div>

          {/* Right Circular Overlay Navigation Arrow */}
          {canScrollRight && (
            <button
              onClick={() => handleScroll('right')}
              className="carousel-nav-btn"
              style={{
                position: 'absolute',
                right: '-20px',
                zIndex: 10,
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: '#ffffff',
                border: '1.5px solid var(--border)',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text)',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.08)';
                e.currentTarget.style.borderColor = 'var(--text)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <ChevronRight size={20} strokeWidth={2.5} />
            </button>
          )}
        </div>
        
        {!isMacroActive && renderAnalyzer()}



      {/* ── Margin & Overhead Trend Chart (Full Width) ── */}
      <div className="card card-pad fade-up" style={{ marginBottom: '2.5rem' }}>
        <div className="card-header">
          <div>
            <div className="card-title">Margin & Overhead Trend</div>
          </div>
        </div>
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradOH" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--indigo)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--indigo)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradCon" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--green)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--green)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: 10, fontWeight: 600, color: 'var(--muted)' }} iconType="circle" iconSize={8} />
              <Area type="monotone" dataKey="totalOverhead" name="Overhead" stroke="var(--indigo)" strokeWidth={2.5} fill="url(#gradOH)" dot={false} activeDot={{ r: 4 }} />
              <Area type="monotone" dataKey="contribution" name="Contribution" stroke="var(--green)" strokeWidth={2.5} fill="url(#gradCon)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
