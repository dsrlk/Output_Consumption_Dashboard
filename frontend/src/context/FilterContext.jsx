import React, { createContext, useContext, useState } from 'react';

// Helper: Start of current month (yyyy-mm-dd)
const getStartOfCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return `${year}-${String(month).padStart(2, '0')}-01`;
};

// Helper: End of current month (yyyy-mm-dd)
const getEndOfCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
};

const FilterContext = createContext(null);

export const FilterProvider = ({ children }) => {
  // Global shared filter state — survives tab switches
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Consumption');
  const [startDate, setStartDate] = useState(getStartOfCurrentMonth());
  const [endDate, setEndDate] = useState(getEndOfCurrentMonth());


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
