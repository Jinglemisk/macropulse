import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export const stocksAPI = {
  getAll: (params) => api.get('/stocks', { params }),
  add: (ticker) => api.post('/stocks', { ticker }),
  delete: (ticker) => api.delete(`/stocks/${ticker}`),
  updateNotes: (ticker, notes) => api.put(`/stocks/${ticker}/notes`, { notes }),
  refreshQuotes: (tickers) => api.post('/stocks/refresh/quotes', { tickers }),
  refreshDetails: (tickers) => api.post('/stocks/refresh/details', { tickers }),
  refreshAll: (tickers) => api.post('/stocks/refresh/all', { tickers })
};

export const regimeAPI = {
  getCurrent: () => api.get('/regime'),
  refresh: (days) => api.post('/regime/refresh', { days })
};

export const portfolioAPI = {
  getSummary: () => api.get('/portfolio/summary')
};

export const refreshAPI = {
  refreshAll: (tickers) => api.post('/refresh', { tickers })
};

export default api;
