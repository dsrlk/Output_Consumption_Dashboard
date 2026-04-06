import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getStatus, triggerRefresh, getRecords, getSections, getKPIs, getStandards, upsertStandard, getStandardHistory, deleteStandard } from '../services/api';
import { RefreshCw, Database, FileSpreadsheet, Target, Save, CheckCircle, History, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import CustomSelect from '../components/CustomSelect';

const TABS = ['Benchmark Standards', 'Data Explorer'];

const KpiRow = ({ kpi, sectionId, existingStandards, draftValues, draftPeriods, savingKpi, savedKpi, setDraftValues, setDraftPeriods, handleSave, onRemove }) => {
  const [showHistory, setShowHistory] = React.useState(false);
  const [history, setHistory] = React.useState([]);
  const [loadingHistory, setLoadingHistory] = React.useState(false);

  const existing = existingStandards[kpi.id];
  const draft = draftValues[kpi.id] ?? '';
  const period = draftPeriods[kpi.id] || 'day';
  const isSaving = savingKpi === kpi.id;
  const isSaved = savedKpi === kpi.id;
  const existingVal = existing?.standard_value;
  const changed = draft !== '' && (parseFloat(draft) !== existingVal || period !== (existing?.period_type || 'day'));

  const openHistory = async () => {
    setShowHistory(true);
    if (history.length === 0) {
      setLoadingHistory(true);
      try {
        const data = await getStandardHistory({ section_id: sectionId, kpi_id: kpi.id });
        setHistory(data);
      } catch (e) { console.error(e); }
      finally { setLoadingHistory(false); }
    }
  };

  return (
    <React.Fragment>
      <tr>
        <td style={{ fontWeight: 500 }}>{kpi.name}</td>
        <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{kpi.unit || '—'}</td>
        <td>
          <CustomSelect 
            value={period} 
            onChange={val => setDraftPeriods(prev => ({ ...prev, [kpi.id]: val }))} 
            options={[{ value: 'day', label: 'Per Day' }, { value: 'ton', label: 'Per Ton' }]} 
            style={{ width: '115px' }} 
          />
        </td>
        <td>
          <input type="number" className="input-field"
            style={{ width: '130px', padding: '0.35rem 0.5rem' }}
            placeholder="Enter value" value={draft}
            onChange={e => setDraftValues(prev => ({ ...prev, [kpi.id]: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleSave(kpi)} />
        </td>
        <td style={{ fontWeight: 600 }}>
          {existingVal != null
            ? <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {existingVal.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/ {existing.period_type === 'ton' ? 'ton' : 'day'}</span>
              </span>
            : <span style={{ color: 'var(--text-muted)' }}>Not set</span>}
        </td>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isSaved ? (
              <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                <CheckCircle size={15} /> Saved
              </span>
            ) : (
              <button className="btn btn-primary"
                style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', opacity: changed ? 1 : 0.35 }}
                disabled={!changed || isSaving} onClick={() => handleSave(kpi)}>
                <Save size={13} /> {isSaving ? '...' : 'Save'}
              </button>
            )}
            {existingVal != null && (
              <button title="Remove standard" onClick={() => onRemove(kpi)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444', padding: '4px', borderRadius: '4px' }}>
                <Trash2 size={14} />
              </button>
            )}
            <button
              title="View change history"
              onClick={openHistory}
              style={{
                border: 'none', background: 'transparent', cursor: 'pointer',
                color: 'var(--text-muted)', padding: '4px', borderRadius: '4px',
                display: 'flex', alignItems: 'center', transition: 'color 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <History size={14} />
            </button>
          </div>
        </td>
      </tr>

      {/* ── History popup modal ── */}
      {showHistory && (
        <tr style={{ display: 'contents' }}>
          <td colSpan="6" style={{ padding: 0, border: 'none' }}>
            <div
              onClick={() => setShowHistory(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  background: 'var(--card-bg)', borderRadius: '16px',
                  padding: '1.75rem 2rem', minWidth: '360px', maxWidth: '480px', width: '90%',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-color)',
                  animation: 'fadeInScale 0.18s ease'
                }}
              >
                {/* Modal header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <History size={16} style={{ color: 'var(--primary)' }} />
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Change History</h3>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {kpi.name}{kpi.unit ? ` (${kpi.unit})` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowHistory(false)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '6px', display: 'flex' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Content */}
                {loadingHistory ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Loading history...
                  </div>
                ) : history.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    No changes recorded yet for this KPI.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '340px', overflowY: 'auto' }}>
                    {history.map((h, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.7rem 1rem', borderRadius: '10px',
                        background: i === 0 ? 'color-mix(in srgb, var(--primary) 7%, transparent)' : 'var(--bg-color)',
                        border: i === 0 ? '1.5px solid color-mix(in srgb, var(--primary) 30%, transparent)' : '1px solid var(--border-color)',
                        opacity: i === 0 ? 1 : 0.72
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {h.saved_at ? format(new Date(h.saved_at), 'dd MMM yyyy, HH:mm') : '—'}
                            </span>
                            {i === 0 && (
                              <span style={{ fontSize: '0.62rem', background: 'color-mix(in srgb, var(--primary) 15%, transparent)', color: 'var(--primary)', borderRadius: '4px', padding: '1px 6px', fontWeight: 700 }}>current</span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                            {h.period_type === 'ton' ? 'Per Ton' : 'Per Day'}
                          </div>
                        </div>
                        <div style={{
                          fontWeight: i === 0 ? 700 : 500,
                          fontSize: i === 0 ? '1.05rem' : '0.9rem',
                          color: i === 0 ? 'var(--primary)' : 'var(--text-main)'
                        }}>
                          {h.standard_value.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};

const DataHub = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(
    location.state?.tab || 'Benchmark Standards'
  );

  // ── Data Explorer ──
  const [status, setStatus] = useState(null);
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setLoadingUpload(true);
      try {
          // Assuming uploadFile is imported from '../services/api'
          const { uploadFile } = await import('../services/api');
          await uploadFile(file);
          await loadStatus();
          setPage(0);
          await loadRecords(0);
      } catch (e) {
          console.error("Upload failed:", e);
          alert("File upload failed. Ensure it's a valid Excel file.");
      } finally {
          setLoadingUpload(false);
          if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
      }
  };

  const [page, setPage] = useState(0);

  // ── Standards ──
  const [sectionsList, setSectionsList] = useState([]);
  const [kpiList, setKpiList] = useState([]);
  const [existingStandards, setExistingStandards] = useState({});
  const [draftValues, setDraftValues] = useState({});
  const [draftPeriods, setDraftPeriods] = useState({});
  const [stdSection, setStdSection] = useState('');
  const [savingKpi, setSavingKpi] = useState(null);
  const [savedKpi, setSavedKpi] = useState(null);

  useEffect(() => { loadStatus(); loadRecords(0); loadSections(); }, []);

  const loadSections = async () => {
    try {
      const sData = await getSections();
      setSectionsList(sData);
      if (sData.length > 0) {
        const corr = sData.find(s => s.name === 'Corrugator') || sData[0];
        setStdSection(corr.id.toString());
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (!stdSection) return;
    const load = async () => {
      try {
        const [kData, sData] = await Promise.all([
          getKPIs({ section_id: stdSection }),
          getStandards({ section_id: stdSection })
        ]);
        const filtered = kData.filter(k => k.category === 'Output' || k.category === 'Consumption');
        setKpiList(filtered);
        const stdMap = {};
        sData.forEach(s => { stdMap[s.kpi_id] = s; });
        setExistingStandards(stdMap);
        const drafts = {}, periods = {};
        filtered.forEach(k => {
          if (stdMap[k.id]) { drafts[k.id] = stdMap[k.id].standard_value.toString(); }
          periods[k.id] = stdMap[k.id]?.period_type || 'day';
        });
        setDraftValues(drafts);
        setDraftPeriods(periods);
      } catch (e) { console.error(e); }
    };
    load();
  }, [stdSection]);

  const handleSave = async (kpi) => {
    const val = parseFloat(draftValues[kpi.id]);
    if (isNaN(val)) return;
    setSavingKpi(kpi.id);
    try {
      const period = draftPeriods[kpi.id] || 'day';
      await upsertStandard({ section_id: stdSection, kpi_id: kpi.id, standard_value: val, period_type: period });
      setExistingStandards(prev => ({ ...prev, [kpi.id]: { standard_value: val, period_type: period } }));
      setSavedKpi(kpi.id);
      setTimeout(() => setSavedKpi(null), 2000);
    } catch (e) { console.error(e); }
    finally { setSavingKpi(null); }
  };

  const handleRemove = async (kpi) => {
    try {
      await deleteStandard({ section_id: stdSection, kpi_id: kpi.id });
      setExistingStandards(prev => { const n = { ...prev }; delete n[kpi.id]; return n; });
      setDraftValues(prev => { const n = { ...prev }; delete n[kpi.id]; return n; });
      setDraftPeriods(prev => ({ ...prev, [kpi.id]: 'day' }));
    } catch (e) { console.error(e); }
  };

  const loadStatus = async () => { try { setStatus(await getStatus()); } catch (e) { console.error(e); } };

  const loadRecords = async (skip) => {
    setLoadingRecords(true);
    try { const data = await getRecords({ skip, limit: 100 }); setRecords(data.data); setTotal(data.total); }
    catch (e) { console.error(e); } finally { setLoadingRecords(false); }
  };

  const handleRefresh = async () => {
    if (loadingRefresh) return;
    setLoadingRefresh(true);
    try { await triggerRefresh(); await loadStatus(); setPage(0); await loadRecords(0); }
    catch (e) { console.error(e); } finally { setLoadingRefresh(false); }
  };

  const handleNextPage = () => { if ((page + 1) * 100 < total) { setPage(page + 1); loadRecords((page + 1) * 100); } };
  const handlePrevPage = () => { if (page > 0) { setPage(page - 1); loadRecords((page - 1) * 100); } };

  // Reusable KPI row — defined at top level of file to avoid remount on re-render

  const GROUPS = [
    { cat: 'Consumption', accent: '#dc2626', bg: 'rgba(220, 38, 38, 0.05)', text: 'var(--text-main)', pill: 'rgba(220, 38, 38, 0.1)', desc: 'Materials & resources consumed during production' },
    { cat: 'Output',      accent: '#52525b', bg: 'rgba(82, 82, 91, 0.05)', text: 'var(--text-main)', pill: 'rgba(82, 82, 91, 0.1)', desc: 'Production volumes & efficiency metrics' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Data Processing Hub</h1>
          <p className="page-description">Ingest Excel files, configure KPI benchmarks, and inspect raw data</p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
            <input 
                type="file" 
                accept=".xls,.xlsx" 
                style={{ display: 'none' }} 
                ref={fileInputRef}
                onChange={handleFileUpload}
            />
            <button 
                className="btn btn-primary" 
                onClick={() => fileInputRef.current?.click()} 
                disabled={loadingUpload || loadingRefresh}
                style={{ background: 'var(--primary)', color: 'white' }}
            >
              {loadingUpload ? 'Uploading...' : 'Upload Excel'}
            </button>
            <button className="btn" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }} onClick={handleRefresh} disabled={loadingRefresh || loadingUpload}>
              <RefreshCw size={18} className={loadingRefresh ? 'spin' : ''} />
              {loadingRefresh ? 'Scanning...' : 'Rescan Folder'}
            </button>
        </div>
      </div>

      {/* Stats */}
      {status && (
        <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="dribbble-card">
            <h3 className="card-title">Last Sync Status</h3>
            <div className="card-value">
              {status.status === 'Success' ? <span className="badge badge-success">{status.status}</span>
               : status.status === 'Warning' ? <span className="badge badge-warning">{status.status}</span>
               : <span className="badge badge-danger">{status.status}</span>}
            </div>
          </div>
          <div className="dribbble-card">
            <h3 className="card-title">Records Processed</h3>
            <div className="card-value">{status.records_processed?.toLocaleString() || 0}</div>
          </div>
          <div className="dribbble-card">
            <h3 className="card-title">Last Sync Time</h3>
            <div className="card-value" style={{ fontSize: '1.25rem', marginTop: '1rem' }}>
              {status.last_refresh ? format(new Date(status.last_refresh), 'Pp') : 'Never'}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color)', marginBottom: '1.5rem' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '0.6rem 1.4rem', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
            background: 'transparent', borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: '-2px', color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)', transition: 'all 0.2s'
          }}>
            {tab === 'Benchmark Standards'
              ? <><Target size={15} style={{ verticalAlign: 'middle', marginRight: '6px' }} />{tab}</>
              : <><Database size={15} style={{ verticalAlign: 'middle', marginRight: '6px' }} />{tab}</>}
          </button>
        ))}
      </div>

      {/* ══ BENCHMARK STANDARDS ══ */}
      {activeTab === 'Benchmark Standards' && (
        <div>
          {/* Controls row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <h3 className="card-title" style={{ margin: '0 0 0.3rem' }}>KPI Benchmark Standards</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                Set a target per KPI. Choose <strong>Per Day</strong> (scaled automatically by working days) or <strong>Per Ton</strong> (for per-ton view). Dashboard will show 🟢 / 🔴 deviation indicators.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Department</span>
              <CustomSelect 
                value={String(stdSection)} 
                onChange={val => setStdSection(val)} 
                options={sectionsList.filter(s => s.name !== 'Sales').map(s => ({ value: String(s.id), label: s.name }))} 
                style={{ width: '180px' }} 
              />
            </div>
          </div>

          {/* Two separate group cards */}
          {GROUPS.map(({ cat, accent, bg, text, pill, desc }) => (
            <div key={cat} style={{
              marginBottom: '1.75rem', borderRadius: '12px', overflow: 'hidden',
              border: `1px solid ${accent}35`,
              boxShadow: `0 2px 12px ${accent}15`
            }}>
              {/* Group header */}
              <div style={{
                background: bg, borderLeft: `5px solid ${accent}`,
                padding: '0.9rem 1.25rem',
                display: 'flex', alignItems: 'center', gap: '1rem'
              }}>
                <span style={{
                  background: pill, color: text, fontWeight: 800,
                  fontSize: '0.75rem', letterSpacing: '0.08em',
                  padding: '5px 14px', borderRadius: '999px',
                  border: `1.5px solid ${accent}60`
                }}>{cat.toUpperCase()}</span>
                <span style={{ fontSize: '0.82rem', color: text, opacity: 0.8, fontWeight: 500 }}>{desc}</span>
              </div>

              {/* KPI table */}
              <div className="table-container" style={{ borderRadius: 0, border: 'none', margin: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>KPI</th><th>Unit</th><th>Period</th>
                      <th>Standard Value</th><th>Currently Set</th>
                      <th style={{ width: '90px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpiList.filter(k => k.category === cat).map(kpi => (
                      <KpiRow key={kpi.id} kpi={kpi}
                        sectionId={stdSection}
                        existingStandards={existingStandards}
                        draftValues={draftValues} draftPeriods={draftPeriods}
                        savingKpi={savingKpi} savedKpi={savedKpi}
                        setDraftValues={setDraftValues} setDraftPeriods={setDraftPeriods}
                        handleSave={handleSave}
                        onRemove={handleRemove} />
                    ))}
                    {kpiList.filter(k => k.category === cat).length === 0 && (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No {cat} KPIs for this department
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ DATA EXPLORER ══ */}
      {activeTab === 'Data Explorer' && (
        <div className="chart-card">
          <h3 className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={18} /> Records (Showing {records.length} of {total})
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn" style={{ background: 'var(--bg-color)' }} onClick={handlePrevPage} disabled={page === 0}>Prev</button>
              <button className="btn" style={{ background: 'var(--bg-color)' }} onClick={handleNextPage} disabled={(page + 1) * 100 >= total}>Next</button>
            </div>
          </h3>
          <div className="table-container">
            {loadingRecords ? <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div> : (
              <table>
                <thead><tr><th>Date</th><th>Section</th><th>KPI</th><th>Unit</th><th>Value</th><th>Source File</th></tr></thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={i}>
                      <td>{r.date}</td>
                      <td><span className="badge badge-success" style={{ background: 'var(--bg-color)' }}>{r.section}</span></td>
                      <td style={{ fontWeight: 500 }}>{r.kpi}</td>
                      <td>{r.unit || '-'}</td>
                      <td>{r.value !== null ? r.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}</td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FileSpreadsheet size={12} />{r.file}</span>
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No records. Click Sync to ingest files.</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default DataHub;
