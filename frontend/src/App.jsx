import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { LayoutDashboard, BarChart2, Settings, LogOut, Lock, User } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import DataHub from './pages/DataHub';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import { FilterProvider } from './context/FilterContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Aurora } from './components/animations/Aurora';

/* ── Page transition ─────────────────────────────── */
const pageVariants = {
  initial: { opacity: 0, y: 22, scale: 0.991, filter: 'blur(4px)' },
  enter: {
    opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
    transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0, y: -12, scale: 0.994, filter: 'blur(3px)',
    transition: { duration: 0.22, ease: [0.7, 0, 0.84, 0] },
  },
};

const PageMotion = ({ children }) => (
  <motion.div variants={pageVariants} initial="initial" animate="enter" exit="exit" style={{ width: '100%' }}>
    {children}
  </motion.div>
);

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/"          element={<PageMotion><Dashboard /></PageMotion>} />
        <Route path="/analytics" element={<PageMotion><Analytics /></PageMotion>} />
        <Route path="/trends"    element={<PageMotion><Analytics /></PageMotion>} />
        <Route path="/login"     element={<PageMotion><LoginPage /></PageMotion>} />
        <Route path="/data-hub"  element={<PageMotion><ProtectedRoute><DataHub /></ProtectedRoute></PageMotion>} />
      </Routes>
    </AnimatePresence>
  );
};

/* ── Top Bar ─────────────────────────────────────── */
const TopBar = () => {
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const topbarRef = useRef(null);

  useEffect(() => {
    const el = topbarRef.current;
    if (!el) return;
    const onScroll = () => el.classList.toggle('scrolled', window.scrollY > 6);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <div className="topbar" ref={topbarRef}>
        {/* Left — brand */}
        <div className="topbar-left">
          <img src="/logo.png" alt="Expack" className="topbar-logo" />
          <span className="topbar-title">
            Expack <span>Analytics</span>
          </span>
        </div>

        {/* Center — navigation */}
        <div className="topbar-center">
          <NavLink to="/"          className={({ isActive }) => `nav-pill${isActive ? ' active' : ''}`}>
            <LayoutDashboard size={15} strokeWidth={2.5} />
            <span className="nav-text">Dashboard</span>
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => `nav-pill${isActive ? ' active' : ''}`}>
            <BarChart2 size={15} strokeWidth={2.5} />
            <span className="nav-text">Analytics</span>
          </NavLink>
          <NavLink to="/data-hub"  className={({ isActive }) => `nav-pill${isActive ? ' active' : ''}`}>
            <Settings size={15} strokeWidth={2.5} />
            <span className="nav-text">Data Hub</span>
          </NavLink>
        </div>

        {/* Right — actions */}
        <div className="topbar-right">
          <div className="topbar-actions-pill">
            {isAdmin ? (
              <button className="icon-btn" title="Sign out" onClick={() => { logout(); navigate('/'); }}>
                <LogOut size={16} strokeWidth={2.5} />
              </button>
            ) : (
              <button className="icon-btn" aria-label="Notifications">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                </svg>
                <span className="notification-dot" />
              </button>
            )}

            <div
              className="avatar"
              title={isAdmin ? 'Admin Profile' : 'Click to Login'}
              onClick={() => { if (!isAdmin) navigate('/login'); }}
              style={{
                position: 'relative',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isAdmin
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'rgba(0, 0, 0, 0.06)',
                color: isAdmin ? '#ffffff' : 'var(--text-muted)',
                border: isAdmin ? '2px solid #10b981' : '1px solid var(--border-color)',
                cursor: isAdmin ? 'default' : 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {isAdmin ? (
                <User size={18} strokeWidth={2.2} />
              ) : (
                <Lock size={14} strokeWidth={2.5} />
              )}
              {isAdmin && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-1px',
                    right: '-1px',
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: '#22c55e',
                    border: '2px solid var(--card-bg)'
                  }}
                  title="Admin Active"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Gradient accent line */}
      <div className="topbar-accent" />
    </>
  );
};

/* ── App ─────────────────────────────────────────── */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FilterProvider>
          <div className="app-container">
            <Aurora />
            <TopBar />
            <main className="main-content">
              <AnimatedRoutes />
            </main>
          </div>
        </FilterProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
