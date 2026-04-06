import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';

const LoginPage = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAdmin } = useAuth();
  const location = useLocation();

  if (isAdmin) {
    return <Navigate to={location.state?.from?.pathname || '/data-hub'} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const success = await login(password);
    if (!success) {
      setError('Invalid admin password');
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '600px' }}>
      <div className="chart-card" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--primary)' }}>
          <Lock size={28} />
        </div>
        <h2 style={{ marginBottom: '0.5rem' }}>Admin Access</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Please enter the master password to access the Data Processing Hub.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <input
              type="password"
              className="input-field"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.8rem', textAlign: 'center', letterSpacing: '0.2rem' }}
              disabled={loading}
              autoFocus
            />
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error}</div>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem', justifyContent: 'center' }} disabled={loading || !password}>
            {loading ? 'Verifying...' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
