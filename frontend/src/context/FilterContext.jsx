import React, { createContext, useContext, useState } from 'react';

// Helper: Start of previous month (yyyy-mm-dd)
const getStartOfPreviousMonth = () => {
  const now = new Date();
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 12 : now.getMonth();
  return `${year}-${String(month).padStart(2, '0')}-01`;
};

// Helper: End of previous month (yyyy-mm-dd)
const getEndOfPreviousMonth = () => {
  const now = new Date();
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 12 : now.getMonth();
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
};

const FilterContext = createContext(null);

export const FilterProvider = ({ children }) => {
  // Global shared filter state — survives tab switches
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Consumption');
  const [startDate, setStartDate] = useState(getStartOfPreviousMonth());
  const [endDate, setEndDate] = useState(getEndOfPreviousMonth());


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
