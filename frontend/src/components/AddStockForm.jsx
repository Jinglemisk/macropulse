import React, { useState } from 'react';
import { cx } from '../utils/classes';

function AddStockForm({ onAdd, loading, compact = false }) {
  const [ticker, setTicker] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const value = ticker.trim().toUpperCase();
    if (!value) return;
    onAdd(value);
    setTicker('');
  };

  return (
    <form
      onSubmit={submit}
      className={cx(
        'flex items-stretch gap-1 font-mono',
        compact ? 'h-7' : 'h-8'
      )}
    >
      <span className={cx(
        'inline-flex items-center px-2 border border-r-0 border-line bg-surf/50 text-muted smallcaps-tight'
      )}>+ TKR</span>
      <input
        type="text"
        value={ticker}
        onChange={(e) => setTicker(e.target.value.toUpperCase())}
        placeholder="AAPL"
        disabled={loading}
        maxLength={6}
        className={cx(
          'min-w-[110px] px-2 bg-bg border border-line text-text uppercase tabular',
          'focus:border-accent focus:outline-none placeholder:text-muted/60',
          'text-[12px]'
        )}
      />
      <button
        type="submit"
        disabled={loading || !ticker.trim()}
        className={cx(
          'px-3 border border-accent/60 bg-accent/10 text-accent smallcaps-tight',
          'hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {loading ? '· · ·' : 'ADD'}
      </button>
    </form>
  );
}

export default AddStockForm;
