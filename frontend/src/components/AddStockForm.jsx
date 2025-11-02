import React, { useState } from 'react';

function AddStockForm({ onAdd, loading }) {
  const [ticker, setTicker] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (ticker.trim()) {
      onAdd(ticker.trim().toUpperCase());
      setTicker('');
    }
  };

  return (
    <form className="add-stock-form" onSubmit={handleSubmit}>
      <input
        type="text"
        value={ticker}
        onChange={(e) => setTicker(e.target.value)}
        placeholder="Enter ticker (e.g., AAPL)"
        disabled={loading}
        maxLength={5}
      />
      <button type="submit" disabled={loading || !ticker.trim()}>
        {loading ? 'Adding...' : 'Add Stock'}
      </button>
    </form>
  );
}

export default AddStockForm;
