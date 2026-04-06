import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart2, Settings, LogOut } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import DataHub from './pages/DataHub';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import { FilterProvider } from './context/FilterContext';
import { AuthProvider, useAuth } from './context/AuthContext';

const TopBar = () => {
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
      logout();
      navigate('/');
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        <img src="/logo.png" alt="Company Logo" className="topbar-logo" />
        <h1 className="topbar-title">Expack Analytics</h1>
      </div>

      <div className="topbar-center">
        <NavLink to="/" className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={16} strokeWidth={2.5} />
          <span className="nav-text">Dashboard</span>
        </NavLink>
        <NavLink to="/analytics" className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}>
          <BarChart2 size={16} strokeWidth={2.5} />
          <span className="nav-text">Analytics</span>
        </NavLink>
        <NavLink to="/data-hub" className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}>
          <Settings size={16} strokeWidth={2.5} />
          <span className="nav-text">Data Hub</span>
        </NavLink>
      </div>

      <div className="topbar-right">
        <div className="topbar-actions-pill">
          {isAdmin ? (
            <button className="icon-btn" title="Logout" onClick={handleLogout}>
              <LogOut size={18} strokeWidth={2.5} />
            </button>
          ) : (
             <button className="icon-btn" aria-label="Notifications">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              <span className="notification-dot"></span>
            </button>
          )}

          <div className="avatar" style={{
            background: isAdmin ? 'var(--primary)' : 'var(--text-main)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.95rem',
            letterSpacing: '-0.02em',
            userSelect: 'none',
          }}>
            {isAdmin ? 'A' : 'T'}
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FilterProvider>
          <div className="app-container">
            <TopBar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/trends" element={<Analytics />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/data-hub" element={<ProtectedRoute><DataHub /></ProtectedRoute>} />
              </Routes>
            </main>
          </div>
        </FilterProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

