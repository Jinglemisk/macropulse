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
  refresh: (tickers) => api.post('/stocks/refresh', { tickers })
};

export const regimeAPI = {
  getCurrent: () => api.get('/regime')
};

export const portfolioAPI = {
  getSummary: () => api.get('/portfolio/summary')
};

export default api;
