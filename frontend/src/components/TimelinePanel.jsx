import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { getStatusColor, getStatusLabel } from '../constants/statuses';
import { formatDate, formatDuration } from '../utils/formatters';

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
    }).catch((err) => { console.error('Failed to load timeline:', err); setItems([]); });
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

  return (
    <div>
      <form className="flex gap-2 mb-6" onSubmit={handleAddNote}>
        <textarea
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
          placeholder="Skriv en anteckning..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
        />
        <button
          className="self-end rounded-lg bg-accent text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          type="submit"
          disabled={saving || !text.trim()}
        >
          {saving ? 'Sparar...' : 'Anteckning'}
        </button>
      </form>
      <div className="space-y-0">
        {items.length === 0 && (
          <p className="text-center py-8 text-sm text-slate-400">Ingen historik ännu.</p>
        )}
        {items.map((item, index) => (
          <div key={item.id} className="flex gap-3 pb-4 relative">
            {index < items.length - 1 && (
              <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-slate-100" />
            )}
            <div>
              {item.type === 'call' ? (
                <span
                  className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: getStatusColor(item.outcome) }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                </span>
              ) : (
                <span className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 bg-slate-400">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {item.type === 'call' && (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                      style={{ backgroundColor: getStatusColor(item.outcome) }}
                    >
                      {getStatusLabel(item.outcome)}
                    </span>
                    {item.duration_seconds > 0 && (
                      <span className="text-xs text-slate-500 font-mono">{formatDuration(item.duration_seconds)}</span>
                    )}
                    <span className="text-xs text-slate-400">{formatDate(item.date)}</span>
                  </div>
                  {item.notes && <p className="text-sm text-slate-700 mt-1">{item.notes}</p>}
                  {item.callback_time && (
                    <p className="text-xs text-blue-600 mt-1">Återring: {formatDate(item.callback_time)}</p>
                  )}
                </>
              )}
              {item.type === 'note' && (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-slate-500 uppercase">Anteckning</span>
                    <span className="text-xs text-slate-400">{formatDate(item.date)}</span>
                  </div>
                  <p className="text-sm text-slate-700 mt-1">{item.text}</p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
