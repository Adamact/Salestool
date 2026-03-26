import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';

const EMPTY_FORM = { title: '', content: '' };

export default function ScriptPanel({ manuscript, onManuscriptChange }) {
  const api = useApi();
  const openings = (manuscript || []).filter((s) => s.section_type === 'opening');

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleEdit = (section) => {
    setEditingId(section.id);
    setForm({ title: section.title, content: section.content });
    setShowAdd(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowAdd(false);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.updateManuscript(editingId, { title: form.title, content: form.content });
      } else {
        const maxOrder = openings.reduce((max, s) => Math.max(max, s.sort_order || 0), 0);
        await api.createManuscript({
          section_type: 'opening',
          title: form.title,
          content: form.content,
          sort_order: maxOrder + 1,
        });
      }
      handleCancel();
      if (onManuscriptChange) onManuscriptChange();
    } catch (err) {
      console.error('Failed to save manuscript:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setSaving(true);
    try {
      await api.deleteManuscript(id);
      if (editingId === id) handleCancel();
      if (onManuscriptChange) onManuscriptChange();
    } catch (err) {
      console.error('Failed to delete manuscript:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="script-panel">
      {openings.length === 0 && !showAdd && (
        <p className="script-panel__empty">Inget manus har lagts till ännu.</p>
      )}

      {openings.map((section) => (
        <div key={section.id} className="script-section">
          {editingId === section.id ? (
            <div className="manuscript-edit">
              <input
                className="manuscript-edit__title"
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Titel"
              />
              <textarea
                className="manuscript-edit__content"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Skriv ditt manus här..."
                rows={6}
              />
              <div className="manuscript-edit__actions">
                <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Sparar...' : 'Spara'}
                </button>
                <button className="btn btn--secondary" onClick={handleCancel}>Avbryt</button>
              </div>
            </div>
          ) : (
            <>
              <div className="script-section__header">
                {section.title && <h3 className="script-section__title">{section.title}</h3>}
                <div className="script-section__btns">
                  <button className="manuscript-icon-btn" onClick={() => handleEdit(section)} title="Redigera">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button className="manuscript-icon-btn manuscript-icon-btn--danger" onClick={() => handleDelete(section.id)} title="Ta bort">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="script-section__body">{section.content}</div>
            </>
          )}
        </div>
      ))}

      {showAdd && (
        <div className="manuscript-edit">
          <input
            className="manuscript-edit__title"
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Titel, t.ex. Öppningsfras"
            autoFocus
          />
          <textarea
            className="manuscript-edit__content"
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="Skriv ditt manus här..."
            rows={6}
          />
          <div className="manuscript-edit__actions">
            <button className="btn btn--primary" onClick={handleSave} disabled={saving || !form.title.trim() || !form.content.trim()}>
              {saving ? 'Sparar...' : 'Lägg till'}
            </button>
            <button className="btn btn--secondary" onClick={handleCancel}>Avbryt</button>
          </div>
        </div>
      )}

      {!showAdd && !editingId && (
        <button
          className="manuscript-add-btn"
          onClick={() => { setShowAdd(true); setForm(EMPTY_FORM); }}
        >
          + Lägg till manus
        </button>
      )}
    </div>
  );
}
