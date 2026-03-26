import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';

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

  return (
    <div className="notes-panel">
      <form className="notes-panel__form" onSubmit={handleSubmit}>
        <textarea
          className="notes-panel__textarea"
          placeholder="Skriv en anteckning..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
        />
        <button className="notes-panel__submit" type="submit" disabled={saving || !text.trim()}>
          {saving ? 'Sparar...' : 'L\u00e4gg till anteckning'}
        </button>
      </form>
      <div className="notes-panel__list">
        {notes.length === 0 && <p className="notes-panel__empty">Inga anteckningar \u00e4nnu.</p>}
        {notes.map((note, i) => (
          <div key={note.id || i} className="note-item">
            <p className="note-item__text">{note.text}</p>
            <span className="note-item__date">{formatDate(note.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
