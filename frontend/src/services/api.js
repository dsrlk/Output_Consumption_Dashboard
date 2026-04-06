import axios from 'axios';

// Read from env (for Vercel). Fallback to local dev server.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8014/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to inject admin token into protected routes
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
        config.headers['X-Admin-Password'] = token;
    }
    return config;
});

// Auth
export const verifyAuth = async (password) => {
    const response = await api.post('/auth/verify', null, {
        headers: { 'X-Admin-Password': password }
    });
    return response.data;
};

// Upload Pipeline
export const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

// Refresh Pipeline
export const triggerRefresh = async () => {
    const response = await api.post('/refresh');
    return response.data;
};

export const getStatus = async () => {
    const response = await api.get('/status');
    return response.data;
}

// Filters
export const getSections = async () => {
    const response = await api.get('/filters/sections');
    return response.data.filter(s => s.name.toLowerCase() !== 'sales');
}

export const getKPIs = async (params = {}) => {
    const response = await api.get('/filters/kpis', { params });
    return response.data;
}

// Analytics 
export const getSummary = async (params) => {
    const response = await api.get('/dashboard/summary', { params });
    return response.data;
}

export const getTrends = async (kpiId, params) => {
    const response = await api.get(`/dashboard/trends`, { params: { kpi_id: kpiId, ...params }});
    return response.data;
}

export const getSectionsContributions = async (params) => {
    const response = await api.get('/dashboard/sections', { params });
    return response.data;
}

export const getCategorySummary = async (params) => {
    const response = await api.get('/dashboard/category_summary', { params });
    return response.data;
}

export const getCategoryDailyMatrix = async (params) => {
    const response = await api.get('/dashboard/category_daily_matrix', { params });
    return response.data;
}

export const getCategoryPerTon = async (params) => {
    const response = await api.get('/dashboard/category_per_ton', { params });
    return response.data;
}

export const getStandards = async (params) => {
    const response = await api.get('/dashboard/standards', { params });
    return response.data;
}

export const upsertStandard = async (params) => {
    const response = await api.post('/dashboard/standards', null, { params });
    return response.data;
}

export const getStandardHistory = async (params) => {
    const response = await api.get('/dashboard/standards/history', { params });
    return response.data;
}

export const deleteStandard = async (params) => {
    const response = await api.delete('/dashboard/standards', { params });
    return response.data;
}

export const getRecords = async (params) => {
    const response = await api.get('/records', { params });
    return response.data;
}

export const getCrossSectionSummary = async (params = {}) => {
    const response = await api.get('/dashboard/cross_section_summary', { params });
    return response.data;
}
