import React, { useEffect, useState } from 'react';
import RegimeDisplay from './components/RegimeDisplay';
import AddStockForm from './components/AddStockForm';
import PortfolioSummaryStrip from './components/PortfolioSummaryStrip';
import StockTable from './components/StockTable';
import NotesPanel from './components/NotesPanel';
import SideMenu from './components/SideMenu';
import { portfolioAPI, refreshAPI, regimeAPI, stocksAPI } from './utils/api';

function App() {
  const [stocks, setStocks] = useState([]);
  const [regime, setRegime] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [refreshReport, setRefreshReport] = useState(null);
  const [editingNotes, setEditingNotes] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const getErrorMessage = (err, fallback) =>
    err.response?.data?.error || err.message || fallback;

  const getReportTone = (refreshStatus) => {
    if (refreshStatus === 'failed') return 'error';
    if (refreshStatus === 'warning') return 'warning';
    return 'success';
  };

  const buildRefreshReport = (result) => {
    const domains = result.domains || {};
    const orderedDomains = [
      ['quotes', 'Quotes'],
      ['details', 'Details'],
      ['macro', 'Macro']
    ]
      .filter(([key]) => domains[key])
      .map(([key, label]) => ({
        key,
        label,
        ...domains[key]
      }));

    return {
      tone: getReportTone(result.status),
      message: result.message,
      domains: orderedDomains,
      updatedAt: new Date().toISOString()
    };
  };

  const loadPortfolioData = async () => {
    const [stocksRes, summaryRes] = await Promise.all([
      stocksAPI.getAll(),
      portfolioAPI.getSummary()
    ]);

    setStocks(stocksRes.data.stocks);
    setSummary(summaryRes.data);
  };

  const loadDashboardData = async ({ showLoading = false } = {}) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      setStatus(null);

      const [stocksRes, regimeRes, summaryRes] = await Promise.allSettled([
        stocksAPI.getAll(),
        regimeAPI.getCurrent(),
        portfolioAPI.getSummary()
      ]);

      if (stocksRes.status === 'rejected') {
        throw stocksRes.reason;
      }

      if (summaryRes.status === 'rejected') {
        throw summaryRes.reason;
      }

      setStocks(stocksRes.value.data.stocks);
      setSummary(summaryRes.value.data);

      if (regimeRes.status === 'fulfilled') {
        setRegime(regimeRes.value.data);
      } else {
        setRegime({
          available: false,
          error: getErrorMessage(regimeRes.reason, 'Failed to load macro regime'),
          refresh: {
            status: 'failed',
            message: 'Macro data unavailable'
          },
          interpretation: []
        });
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError(getErrorMessage(err, 'Failed to load data'));
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const loadInitialData = async () => {
    await loadDashboardData({ showLoading: true });
  };

  const handleAddStock = async (ticker) => {
    try {
      setAdding(true);
      setError(null);
      setStatus(null);
      setRefreshReport(null);

      await stocksAPI.add(ticker);
      await loadPortfolioData();
      setStatus({ tone: 'success', message: `${ticker} added to the portfolio.` });
    } catch (err) {
      console.error('Error adding stock:', err);
      setError(getErrorMessage(err, 'Failed to add stock'));
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteStock = async (ticker) => {
    try {
      setError(null);
      setStatus(null);
      setRefreshReport(null);
      await stocksAPI.delete(ticker);
      await loadPortfolioData();
      setStatus({ tone: 'success', message: `${ticker} removed from the portfolio.` });
    } catch (err) {
      console.error('Error deleting stock:', err);
      setError(getErrorMessage(err, 'Failed to delete stock'));
    }
  };

  const handleRefreshAll = async () => {
    try {
      setRefreshingAll(true);
      setError(null);
      setStatus({ tone: 'info', message: 'Refreshing quotes, details, and macro data...' });

      const refreshRes = await refreshAPI.refreshAll();
      await loadDashboardData();

      setRefreshReport(buildRefreshReport(refreshRes.data));
      setStatus({
        tone: getReportTone(refreshRes.data.status),
        message: refreshRes.data.message
      });
    } catch (err) {
      console.error('Error refreshing dashboard:', err);
      setError(getErrorMessage(err, 'Failed to refresh dashboard data'));
      setStatus(null);
    } finally {
      setRefreshingAll(false);
    }
  };

  const handleSaveNotes = async (ticker, notes) => {
    try {
      setError(null);
      await stocksAPI.updateNotes(ticker, notes);
      setStocks(currentStocks => currentStocks.map(stock =>
        stock.ticker === ticker ? { ...stock, notes } : stock
      ));
      setStatus({ tone: 'success', message: `Saved notes for ${ticker}.` });
    } catch (err) {
      console.error(`Error saving notes for ${ticker}:`, err);
      setError(getErrorMessage(err, `Failed to save notes for ${ticker}`));
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <>
      <SideMenu />
      <div style={{ padding: '24px', paddingLeft: '100px', maxWidth: '1700px', margin: '0 auto' }}>
        <header
          id="home"
          style={{
            marginBottom: '20px',
            scrollMarginTop: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '24px'
          }}
        >
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
              Macro Pulse
            </h1>
            <p style={{ color: '#a0a0a0', fontSize: '14px' }}>
              Track stock classifications across macro regimes
            </p>
          </div>

          <button className="primary" onClick={handleRefreshAll} disabled={refreshingAll}>
            {refreshingAll ? 'Refreshing...' : 'Refresh Dashboard'}
          </button>
        </header>

        {refreshReport && (
          <div className={`refresh-report ${refreshReport.tone}`} style={{ marginBottom: '16px' }}>
            <div className="refresh-report-header">
              <strong>{refreshReport.message}</strong>
            </div>
            <div className="refresh-report-domains">
              {refreshReport.domains.map(domain => (
                <div key={domain.key} className="refresh-report-domain">
                  <span className="refresh-report-domain-label">{domain.label}</span>
                  <span className={`refresh-report-domain-status ${domain.status}`}>
                    {domain.status}
                  </span>
                  <span>
                    {domain.key === 'macro'
                      ? `${domain.succeeded} series succeeded, ${domain.failed} failed`
                      : `${domain.succeeded}/${domain.requested} succeeded`}
                  </span>
                  <span className="refresh-report-domain-message">{domain.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {status && (
          <div className={`status-banner ${status.tone}`} style={{ marginBottom: '16px' }}>
            {status.message}
          </div>
        )}

        {error && (
          <div className="status-banner error" style={{ marginBottom: '24px' }}>
            {error}
          </div>
        )}

        <RegimeDisplay regime={regime} loading={false} error={null} />

        <PortfolioSummaryStrip summary={summary} />

        <AddStockForm onAdd={handleAddStock} loading={adding} />

        <section id="stocks" style={{ scrollMarginTop: '20px' }}>
          <StockTable
            stocks={stocks}
            onDelete={handleDeleteStock}
            onEditNotes={(ticker, notes) => setEditingNotes({ ticker, notes })}
            macroRefresh={regime?.refresh || null}
          />
        </section>

        {editingNotes && (
          <NotesPanel
            ticker={editingNotes.ticker}
            notes={editingNotes.notes}
            onSave={handleSaveNotes}
            onClose={() => setEditingNotes(null)}
          />
        )}
      </div>
    </>
  );
}

export default App;
