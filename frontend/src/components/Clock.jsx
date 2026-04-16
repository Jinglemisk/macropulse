import React, { useEffect, useState } from 'react';

const fmt = (n) => String(n).padStart(2, '0');

function Clock() {
  const [t, setT] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = fmt(t.getHours());
  const mm = fmt(t.getMinutes());
  const ss = fmt(t.getSeconds());
  const utc = `${fmt(t.getUTCHours())}:${fmt(t.getUTCMinutes())}`;

  return (
    <div className="font-mono tabular text-text leading-none flex items-baseline gap-2">
      <span className="text-[14px] tracking-tight">{hh}:{mm}<span className="text-muted">:{ss}</span></span>
      <span className="text-muted text-[10px] smallcaps-tight">UTC {utc}</span>
    </div>
  );
}

export default Clock;
