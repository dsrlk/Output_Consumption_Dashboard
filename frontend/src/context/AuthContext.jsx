import React, { createContext, useContext, useState, useEffect } from 'react';
import { verifyAuth } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Check if we have a token stored and verify it
    const storedToken = localStorage.getItem('admin_token');
    if (storedToken) {
      verifyAuth(storedToken)
        .then(() => setIsAdmin(true))
        .catch(() => {
            localStorage.removeItem('admin_token');
            setIsAdmin(false);
        })
        .finally(() => setIsInitializing(false));
    } else {
      setIsInitializing(false);
    }
  }, []);

  const login = async (password) => {
    try {
      await verifyAuth(password);
      localStorage.setItem('admin_token', password);
      setIsAdmin(true);
      return true;
    } catch (e) {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ isAdmin, isInitializing, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
