import React, { useState, useEffect, useRef } from 'react';
import { getStatusColor, CALL_OUTCOMES as OUTCOMES } from '../constants/statuses';

export default function LogCallModal({ lead, onSave, onClose }) {
  const [outcome, setOutcome] = useState('no_answer');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [callbackTime, setCallbackTime] = useState('');
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const notesRef = useRef(null);

  // Call duration timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Auto-focus notes after outcome selection
  useEffect(() => {
    if (outcome && notesRef.current) {
      notesRef.current.focus();
    }
  }, [outcome]);

  // Keyboard shortcuts: 1-9 for outcomes, Enter to save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'TEXTAREA') {
        // Only handle Enter (without shift) in textarea to save
        if (e.key === 'Enter' && !e.shiftKey && e.ctrlKey) {
          e.preventDefault();
          if (!saving) handleSave();
        }
        return;
      }
      const num = parseInt(e.key);
      if (num >= 1 && num <= OUTCOMES.length) {
        e.preventDefault();
        setOutcome(OUTCOMES[num - 1].value);
      }
      if (e.key === 'Enter' && !saving) {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [outcome, notes, saving, callbackTime]);

  const handleSave = async () => {
    setSaving(true);
    const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
    try {
      await onSave(outcome, notes, {
        callback_time: outcome === 'callback' ? callbackTime || null : null,
        duration_seconds: durationSeconds,
      });
    } finally {
      setSaving(false);
    }
  };

  if (!lead) return null;

  // Default callback time to tomorrow at 10:00
  const getDefaultCallbackTime = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>Logga samtal</h3>
          <span className="modal__timer">{formatTimer(elapsed)}</span>
          <button className="modal__close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal__body">
          <p className="modal__lead-info">
            <strong>{lead.company}</strong> &mdash; {lead.contact_name}
          </p>

          <label className="modal__label">Resultat <span className="modal__hint">(tryck 1-9)</span></label>
          <div className="outcome-grid">
            {OUTCOMES.map((o, idx) => (
              <button
                key={o.value}
                className={`outcome-btn ${outcome === o.value ? 'outcome-btn--active' : ''}`}
                style={outcome === o.value ? { backgroundColor: getStatusColor(o.value), color: '#fff', borderColor: getStatusColor(o.value) } : {}}
                onClick={() => setOutcome(o.value)}
                type="button"
              >
                <span className="outcome-btn__key">{idx + 1}</span> {o.label}
              </button>
            ))}
          </div>

          {outcome === 'callback' && (
            <div className="modal__callback-time">
              <label className="modal__label">Återring tid</label>
              <input
                type="datetime-local"
                className="modal__datetime"
                value={callbackTime || getDefaultCallbackTime()}
                onChange={(e) => setCallbackTime(e.target.value)}
              />
            </div>
          )}

          <label className="modal__label">Anteckningar (valfritt) <span className="modal__hint">Ctrl+Enter för att spara</span></label>
          <textarea
            ref={notesRef}
            className="modal__textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Anteckningar om samtalet..."
          />
        </div>
        <div className="modal__footer">
          <button className="btn btn--secondary" onClick={onClose}>Avbryt</button>
          <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Sparar...' : 'Spara'}
          </button>
        </div>
      </div>
    </div>
  );
}
