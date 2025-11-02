import React, { useState, useEffect } from 'react';

function NotesPanel({ ticker, notes, onSave, onClose }) {
  const [editedNotes, setEditedNotes] = useState(notes || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditedNotes(notes || '');
  }, [notes]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(ticker, editedNotes);
      onClose();
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Notes for {ticker}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <textarea
            value={editedNotes}
            onChange={(e) => setEditedNotes(e.target.value)}
            placeholder="Enter notes in markdown format...&#10;&#10;## Investment Thesis&#10;- Key point 1&#10;- Key point 2&#10;&#10;**Status:** Watching"
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotesPanel;
