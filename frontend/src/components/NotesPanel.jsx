import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { formatDate } from '../utils/formatters';

export default function NotesPanel({ leadId }) {
  const api = useApi();
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const loadNotes = useCallback(() => {
    if (!leadId) return;
    api.getLeadNotes(leadId)
      .then((data) => setNotes(Array.isArray(data) ? data : []))
      .catch(() => setNotes([]));
  }, [api, leadId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || !leadId) return;
    setSaving(true);
    try {
      await api.addNote(leadId, text.trim());
      setText('');
      loadNotes();
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <form className="flex flex-col gap-2 mb-6" onSubmit={handleSubmit}>
        <textarea
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-y"
          placeholder="Skriv en anteckning..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
        />
        <button
          className="self-end rounded-lg bg-accent text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          type="submit"
          disabled={saving || !text.trim()}
        >
          {saving ? 'Sparar...' : 'Lägg till anteckning'}
        </button>
      </form>
      <div className="space-y-2">
        {notes.length === 0 && (
          <p className="text-center py-8 text-sm text-slate-400">Inga anteckningar ännu.</p>
        )}
        {notes.map((note, i) => (
          <div key={note.id || i} className="rounded-lg border border-slate-100 p-3">
            <p className="text-sm text-slate-700">{note.text}</p>
            <span className="text-xs text-slate-400 mt-1 block">{formatDate(note.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
