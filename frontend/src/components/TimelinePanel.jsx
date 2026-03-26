import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { getStatusColor, getStatusLabel } from '../constants/statuses';

export default function TimelinePanel({ leadId }) {
  const api = useApi();
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const loadTimeline = useCallback(() => {
    if (!leadId) return;
    Promise.all([
      api.getLeadNotes(leadId),
      api.getCallHistory(leadId),
    ]).then(([notes, calls]) => {
      const noteItems = (Array.isArray(notes) ? notes : []).map((n) => ({
        type: 'note',
        id: `note-${n.id}`,
        date: n.created_at,
        text: n.text,
      }));
      const callItems = (Array.isArray(calls) ? calls : []).map((c) => ({
        type: 'call',
        id: `call-${c.id}`,
        date: c.called_at,
        outcome: c.outcome,
        notes: c.notes,
        duration_seconds: c.duration_seconds,
        callback_time: c.callback_time,
      }));
      const merged = [...noteItems, ...callItems].sort(
        (a, b) => new Date(b.date + 'Z') - new Date(a.date + 'Z')
      );
      setItems(merged);
    }).catch(() => setItems([]));
  }, [api, leadId]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!text.trim() || !leadId) return;
    setSaving(true);
    try {
      await api.addNote(leadId, text.trim());
      setText('');
      loadTimeline();
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'Z');
      return d.toLocaleString('sv-SE', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDuration = (secs) => {
    if (!secs) return null;
    return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="timeline-panel">
      <form className="timeline-panel__form" onSubmit={handleAddNote}>
        <textarea
          className="timeline-panel__textarea"
          placeholder="Skriv en anteckning..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
        />
        <button className="timeline-panel__submit" type="submit" disabled={saving || !text.trim()}>
          {saving ? 'Sparar...' : 'Anteckning'}
        </button>
      </form>
      <div className="timeline-panel__list">
        {items.length === 0 && <p className="timeline-panel__empty">Ingen historik ännu.</p>}
        {items.map((item) => (
          <div key={item.id} className={`timeline-item timeline-item--${item.type}`}>
            <div className="timeline-item__marker">
              {item.type === 'call' ? (
                <span className="timeline-item__icon timeline-item__icon--call" style={{ backgroundColor: getStatusColor(item.outcome) }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                </span>
              ) : (
                <span className="timeline-item__icon timeline-item__icon--note">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </span>
              )}
            </div>
            <div className="timeline-item__content">
              {item.type === 'call' && (
                <>
                  <div className="timeline-item__header">
                    <span className="timeline-item__badge" style={{ backgroundColor: getStatusColor(item.outcome) }}>
                      {getStatusLabel(item.outcome)}
                    </span>
                    {item.duration_seconds > 0 && (
                      <span className="timeline-item__duration">{formatDuration(item.duration_seconds)}</span>
                    )}
                    <span className="timeline-item__date">{formatDate(item.date)}</span>
                  </div>
                  {item.notes && <p className="timeline-item__text">{item.notes}</p>}
                  {item.callback_time && (
                    <p className="timeline-item__callback">Återring: {formatDate(item.callback_time)}</p>
                  )}
                </>
              )}
              {item.type === 'note' && (
                <>
                  <div className="timeline-item__header">
                    <span className="timeline-item__note-label">Anteckning</span>
                    <span className="timeline-item__date">{formatDate(item.date)}</span>
                  </div>
                  <p className="timeline-item__text">{item.text}</p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
