import { useCallback, useEffect, useState } from 'react';
import { portfolioAPI, refreshAPI, regimeAPI, stocksAPI } from '../utils/api';

const errMsg = (err, fallback) =>
  err?.response?.data?.error || err?.message || fallback;

const reportTone = (status) =>
  status === 'failed' ? 'error' : status === 'warning' ? 'warning' : 'success';

function buildRefreshReport(result) {
  const domains = result.domains || {};
  const ordered = [
    ['quotes', 'Quotes'],
    ['details', 'Details'],
    ['macro', 'Macro']
  ]
    .filter(([key]) => domains[key])
    .map(([key, label]) => ({ key, label, ...domains[key] }));
  return {
    tone: reportTone(result.status),
    message: result.message,
    domains: ordered,
    updatedAt: new Date().toISOString()
  };
}

export function useDashboardData() {
  const [stocks, setStocks] = useState([]);
  const [regime, setRegime] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [refreshReport, setRefreshReport] = useState(null);

  const loadPortfolio = useCallback(async () => {
    const [stocksRes, summaryRes] = await Promise.all([
      stocksAPI.getAll(),
      portfolioAPI.getSummary()
    ]);
    setStocks(stocksRes.data.stocks);
    setSummary(summaryRes.data);
  }, []);

  const loadAll = useCallback(async ({ showLoading = false } = {}) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      setStatus(null);

      const [stocksRes, regimeRes, summaryRes] = await Promise.allSettled([
        stocksAPI.getAll(),
        regimeAPI.getCurrent(),
        portfolioAPI.getSummary()
      ]);

      if (stocksRes.status === 'rejected')  throw stocksRes.reason;
      if (summaryRes.status === 'rejected') throw summaryRes.reason;

      setStocks(stocksRes.value.data.stocks);
      setSummary(summaryRes.value.data);

      if (regimeRes.status === 'fulfilled') {
        setRegime(regimeRes.value.data);
      } else {
        setRegime({
          available: false,
          error: errMsg(regimeRes.reason, 'Failed to load macro regime'),
          refresh: { status: 'failed', message: 'Macro data unavailable' },
          interpretation: []
        });
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError(errMsg(err, 'Failed to load data'));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll({ showLoading: true }); }, [loadAll]);

  const addStock = useCallback(async (ticker) => {
    try {
      setAdding(true); setError(null); setStatus(null); setRefreshReport(null);
      await stocksAPI.add(ticker);
      await loadPortfolio();
      setStatus({ tone: 'success', message: `${ticker} added.` });
    } catch (err) {
      console.error('add stock', err);
      setError(errMsg(err, 'Failed to add stock'));
    } finally { setAdding(false); }
  }, [loadPortfolio]);

  const deleteStock = useCallback(async (ticker) => {
    try {
      setError(null); setStatus(null); setRefreshReport(null);
      await stocksAPI.delete(ticker);
      await loadPortfolio();
      setStatus({ tone: 'success', message: `${ticker} removed.` });
    } catch (err) {
      console.error('delete stock', err);
      setError(errMsg(err, 'Failed to delete stock'));
    }
  }, [loadPortfolio]);

  const refreshAll = useCallback(async () => {
    try {
      setRefreshingAll(true); setError(null);
      setStatus({ tone: 'info', message: 'Refreshing quotes, details, and macro…' });
      const res = await refreshAPI.refreshAll();
      await loadAll();
      setRefreshReport(buildRefreshReport(res.data));
      setStatus({ tone: reportTone(res.data.status), message: res.data.message });
    } catch (err) {
      console.error('refresh', err);
      setError(errMsg(err, 'Failed to refresh dashboard data'));
      setStatus(null);
    } finally { setRefreshingAll(false); }
  }, [loadAll]);

  const saveNotes = useCallback(async (ticker, notes) => {
    try {
      setError(null);
      await stocksAPI.updateNotes(ticker, notes);
      setStocks((current) => current.map((s) => s.ticker === ticker ? { ...s, notes } : s));
      setStatus({ tone: 'success', message: `Saved notes for ${ticker}.` });
    } catch (err) {
      console.error('save notes', err);
      setError(errMsg(err, `Failed to save notes for ${ticker}`));
    }
  }, []);

  const dismissStatus = useCallback(() => setStatus(null), []);
  const dismissError  = useCallback(() => setError(null), []);

  return {
    stocks, regime, summary, loading,
    adding, refreshingAll,
    error, status, refreshReport,
    addStock, deleteStock, refreshAll, saveNotes,
    dismissStatus, dismissError
  };
}
