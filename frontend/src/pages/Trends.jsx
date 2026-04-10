import React, { useState, useEffect } from 'react';
import { getKPIs, getSections, getTrends } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Filter } from 'lucide-react';
import { useFilters } from '../context/FilterContext';
import CustomSelect from '../components/CustomSelect';

const Trends = () => {
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState([]);
  const [sectionsList, setSectionsList] = useState([]);
  const [selectedKpi, setSelectedKpi] = useState('');

  // Shared persistent filter state from context
  const { selectedSection, setSelectedSection, startDate, setStartDate, endDate, setEndDate } = useFilters();

  // Initial Dropdowns Load
  useEffect(() => {
    const initDropdowns = async () => {
      try {
        const sData = await getSections();
        setSectionsList(sData);
        const kData = await getKPIs();
        setKpis(kData);
        if (kData.length > 0 && !selectedKpi) {
           const weightKpi = kData.find(k => k.name.includes("Weight") && !k.name.includes("Efficiency"));
           setSelectedKpi(weightKpi ? weightKpi.id.toString() : kData[0].id.toString());
        }
      } catch (err) {
        console.error("Error loading filters", err);
      }
    };
    initDropdowns();
  }, []);

  // Update KPIs when Section changes
  useEffect(() => {
    const updateKpis = async () => {
      try {
        const params = selectedSection ? { section_id: selectedSection } : {};
        const kData = await getKPIs(params);
        setKpis(kData);
        
        // Auto-select first KPI if current is now invalid
        if (kData.length > 0 && !kData.find(k => k.id.toString() === selectedKpi)) {
           setSelectedKpi(kData[0].id.toString());
        }
      } catch (err) {
         console.error(err);
      }
    };
    updateKpis();
  }, [selectedSection]);

  // Sync Data on Slicer Change
  useEffect(() => {
    if (!selectedKpi) return;
    
    const fetchTrends = async () => {
      setLoading(true);
      try {
        const params = {};
        if (selectedSection) params.section_id = selectedSection;
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        
        const data = await getTrends(selectedKpi, params);
        setTrendData(data);
      } catch (e) {
        console.error("Failed to load trends", e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrends();
  }, [selectedKpi, selectedSection, startDate, endDate]);

  const activeKpiObj = kpis.find(k => k.id === parseInt(selectedKpi));
  const unitLabel = activeKpiObj?.unit ? ` ${activeKpiObj.unit}` : '';

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} style={{ color: entry.color, margin: 0 }}>
              {entry.name}: {entry.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}{unitLabel}
            </p>
          ))}
          {payload[0]?.payload?.is_anomaly && (
            <p style={{ color: 'var(--danger)', marginTop: '0.5rem', fontWeight: 600 }}>Anomaly Detected</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Trends Analysis</h1>
        <p className="page-description">Deep dive into specific KPIs over strictly filtered time constraints</p>
      </div>

      {/* Control Panel Slicers */}
      <div className="card" style={{ marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', background: 'var(--card-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', color: 'var(--primary)', fontWeight: '600', marginRight: '1rem' }}>
          <Filter size={18} style={{ marginRight: '6px' }} /> Constraints
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Isolate Section</span>
          <CustomSelect 
            value={String(selectedSection || '')} 
            onChange={val => setSelectedSection(val)} 
            options={[
              { value: '', label: 'All active sections' },
              ...sectionsList.map(s => ({ value: String(s.id), label: s.name }))
            ]} 
            style={{ width: '180px' }} 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Dimension (KPI)</span>
          <CustomSelect 
            value={String(selectedKpi)} 
            onChange={val => setSelectedKpi(val)} 
            options={kpis.map(k => ({ value: String(k.id), label: `${k.name} ${k.unit ? `(${k.unit})` : ''}` }))} 
            style={{ width: '250px' }} 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From Date</span>
          <input 
            type="date" 
            className="input-field" 
            style={{ padding: '0.5rem' }} 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)} 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>To Date</span>
          <input 
            type="date" 
            className="input-field" 
            style={{ padding: '0.5rem' }} 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)} 
          />
        </div>
      </div>

      <div className="chart-card">
        <h3 className="card-title" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem'}}>
          <TrendingUp size={18}/> Flow Tracker
          {loading && <span className="badge badge-warning" style={{marginLeft: 'auto'}}>Loading...</span>}
        </h3>
        
        {trendData.length > 0 ? (
          <div className="chart-container" style={{ height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tickMargin={10} 
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }} 
                />
                <YAxis 
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  name="Daily Aggregate" 
                  stroke={activeKpiObj?.category === 'Output' ? 'var(--text-main)' : 'var(--primary)'}
                  strokeWidth={2}
                  dot={{ r: 4, fill: 'var(--card-bg)', strokeWidth: 2 }}
                  activeDot={{ r: 6 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="moving_avg_7d" 
                  name="7-day MA Variance" 
                  stroke="var(--warning)" 
                  strokeWidth={2} 
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          !loading && (
            <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No data available for this constraint setup.
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default Trends;
