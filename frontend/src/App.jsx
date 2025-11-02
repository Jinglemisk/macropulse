import React, { useState, useEffect } from 'react';
import RegimeDisplay from './components/RegimeDisplay';
import AddStockForm from './components/AddStockForm';
import StockTable from './components/StockTable';
import NotesPanel from './components/NotesPanel';
import { stocksAPI, regimeAPI } from './utils/api';

function App() {
  const [stocks, setStocks] = useState([]);
  const [regime, setRegime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [editingNotes, setEditingNotes] = useState(null); // { ticker, notes }

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [stocksRes, regimeRes] = await Promise.all([
        stocksAPI.getAll(),
        regimeAPI.getCurrent()
      ]);

      setStocks(stocksRes.data.stocks);
      setRegime(regimeRes.data);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (ticker) => {
    try {
      setAdding(true);
      setError(null);

      const res = await stocksAPI.add(ticker);
      setStocks([...stocks, res.data]);
    } catch (err) {
      console.error('Error adding stock:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to add stock';
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteStock = async (ticker) => {
    try {
      await stocksAPI.delete(ticker);
      setStocks(stocks.filter(s => s.ticker !== ticker));
    } catch (err) {
      console.error('Error deleting stock:', err);
      alert(err.response?.data?.error || 'Failed to delete stock');
    }
  };

  const handleRefreshAll = async () => {
    try {
      setRefreshing(true);
      setError(null);

      await stocksAPI.refresh();
      await loadData(); // Reload all data
    } catch (err) {
      console.error('Error refreshing stocks:', err);
      setError(err.response?.data?.error || 'Failed to refresh stocks');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveNotes = async (ticker, notes) => {
    await stocksAPI.updateNotes(ticker, notes);
    setStocks(stocks.map(s =>
      s.ticker === ticker ? { ...s, notes } : s
    ));
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
          Investment Dashboard
        </h1>
        <p style={{ color: '#a0a0a0', fontSize: '14px' }}>
          Track stock classifications across macro regimes
        </p>
      </header>

      {error && (
        <div className="error" style={{ marginBottom: '24px' }}>
          {error}
        </div>
      )}

      <RegimeDisplay
        regime={regime}
        loading={false}
        error={regime ? null : 'Failed to load regime'}
      />

      <AddStockForm onAdd={handleAddStock} loading={adding} />

      <StockTable
        stocks={stocks}
        onRefresh={handleRefreshAll}
        onDelete={handleDeleteStock}
        onEditNotes={(ticker, notes) => setEditingNotes({ ticker, notes })}
        refreshing={refreshing}
      />

      {editingNotes && (
        <NotesPanel
          ticker={editingNotes.ticker}
          notes={editingNotes.notes}
          onSave={handleSaveNotes}
          onClose={() => setEditingNotes(null)}
        />
      )}
    </div>
  );
}

export default App;
