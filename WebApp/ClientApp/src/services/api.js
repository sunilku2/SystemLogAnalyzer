import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchConfig = async () => {
  const response = await api.get('/config');
  return response.data;
};

export const fetchSessions = async () => {
  const response = await api.get('/logs/sessions');
  return response.data;
};

export const fetchAvailableModels = async (provider) => {
  const response = await api.get('/models/available', {
    params: { provider }
  });
  return response.data;
};

export const runAnalysis = async (settings) => {
  const response = await api.post('/analyze', {
    use_llm: settings.useLlm,
    model: settings.model,
    provider: settings.provider,
    auto_download: settings.autoDownload || false
  });
  return response.data;
};

export const fetchLatestReport = async () => {
  try {
    const response = await api.get('/reports/latest');
    return response.data;
  } catch (error) {
    // Handle error gracefully - return empty success response
    return { success: false, error: 'No report available' };
  }
};

export const fetchAnalysisState = async () => {
  const response = await api.get('/analysis/state');
  return response.data;
};

export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const exportReport = async (format = 'json', reportType = 'General Report') => {
  try {
    console.log('exportReport called with format:', format, 'reportType:', reportType);
    
    // For JSON and CSV, use direct link download via GET request
    if (format === 'json' || format === 'csv') {
      console.log('Triggering direct download for:', format);
      
      // Create direct download link
      const url = `${API_BASE_URL}/reports/export?format=${format}&reportType=${encodeURIComponent(reportType)}`;
      console.log('Download URL:', url);
      
      // Open in new window to trigger download
      window.open(url, '_blank');
      
      console.log('Download window opened');
      return { success: true, filename: `fleet_analysis.${format}` };
    } else {
      // For other formats, expect JSON response
      console.log('Requesting JSON response for:', format);
      const response = await api.post('/reports/export', { format });
      console.log('JSON response received:', response.data);
      return response.data;
    }
  } catch (error) {
    console.error('Export error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    return { 
      success: false, 
      error: error.response?.data?.error || error.message || 'Export failed'
    };
  }
};

export default api;
