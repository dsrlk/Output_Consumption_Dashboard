import React, { createContext, useContext, useState } from 'react';

// Helper: today as yyyy-mm-dd string
const today = () => new Date().toISOString().split('T')[0];

// Helper: Jan 1 of current year
const startOfYear = () => `${new Date().getFullYear()}-01-01`;

const FilterContext = createContext(null);

export const FilterProvider = ({ children }) => {
  // Global shared filter state — survives tab switches
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Consumption');
  const [startDate, setStartDate] = useState(today());  // Default: today
  const [endDate, setEndDate] = useState(today());       // Default: today


  return (
    <FilterContext.Provider value={{
      selectedSection, setSelectedSection,
      selectedCategory, setSelectedCategory,
      startDate, setStartDate,
      endDate, setEndDate,
    }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within FilterProvider');
  return ctx;
};
