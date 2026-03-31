import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';

const EMPTY_FORM = { title: '', content: '' };

export default function ObjectionsPanel({ manuscript, onManuscriptChange }) {
  const api = useApi();
  const objections = (manuscript || []).filter((s) => s.section_type === 'objection');

  const [closedIds, setClosedIds] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const allOpen = objections.length > 0 && objections.every((o) => !closedIds.has(o.id));

  const toggleAll = () => {
    if (allOpen) {
      setClosedIds(new Set(objections.map((o) => o.id)));
    } else {
      setClosedIds(new Set());
    }
  };

  const toggleOne = (id) => {
    setClosedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEdit = (e, obj) => {
    e.stopPropagation();
    setEditingId(obj.id);
    setClosedIds((prev) => { const next = new Set(prev); next.delete(obj.id); return next; });
    setForm({ title: obj.title, content: obj.content });
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
        const maxOrder = (manuscript || []).reduce((max, s) => Math.max(max, s.sort_order || 0), 0);
        await api.createManuscript({
          section_type: 'objection',
          title: form.title,
          content: form.content,
          sort_order: maxOrder + 1,
        });
      }
      handleCancel();
      if (onManuscriptChange) onManuscriptChange();
    } catch (err) {
      console.error('Failed to save objection:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    setSaving(true);
    try {
      await api.deleteManuscript(id);
      if (editingId === id) handleCancel();
      setClosedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      if (onManuscriptChange) onManuscriptChange();
    } catch (err) {
      console.error('Failed to delete objection:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="objections-panel">
      {objections.length === 0 && !showAdd && (
        <p className="objections-panel__empty">Inga invändningar har lagts till ännu.</p>
      )}

      {objections.length > 1 && (
        <button className="btn btn--secondary btn--sm" onClick={toggleAll} style={{ marginBottom: '0.5rem' }}>
          {allOpen ? 'Dölj alla' : 'Visa alla'}
        </button>
      )}

      {objections.map((obj) => {
        const isOpen = !closedIds.has(obj.id);
        const isEditing = editingId === obj.id;

        return (
          <div key={obj.id} className={`objection-card ${isOpen ? 'objection-card--open' : ''}`}>
            <button
              className="objection-card__header"
              onClick={() => { if (!isEditing) toggleOne(obj.id); }}
              aria-expanded={isOpen}
            >
              <span className="objection-card__title">{isEditing ? form.title || obj.title : obj.title}</span>
              <span className="objection-card__header-right">
                {isOpen && !isEditing && (
                  <>
                    <span className="manuscript-icon-btn manuscript-icon-btn--inline" onClick={(e) => handleEdit(e, obj)} title="Redigera">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </span>
                    <span className="manuscript-icon-btn manuscript-icon-btn--inline manuscript-icon-btn--danger" onClick={(e) => handleDelete(e, obj.id)} title="Ta bort">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </span>
                  </>
                )}
                <span className="objection-card__chevron">{isOpen ? '\u25B2' : '\u25BC'}</span>
              </span>
            </button>
            {isOpen && (
              isEditing ? (
                <div className="objection-card__edit">
                  <div className="manuscript-edit">
                    <input
                      className="manuscript-edit__title"
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Invändning, t.ex. 'Vi har redan en leverantör'"
                    />
                    <textarea
                      className="manuscript-edit__content"
                      value={form.content}
                      onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                      placeholder="Skriv ditt svar på invändningen..."
                      rows={4}
                    />
                    <div className="manuscript-edit__actions">
                      <button className="btn btn--primary" onClick={handleSave} disabled={saving || !form.title.trim() || !form.content.trim()}>
                        {saving ? 'Sparar...' : 'Spara'}
                      </button>
                      <button className="btn btn--secondary" onClick={handleCancel}>Avbryt</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="objection-card__body">{obj.content}</div>
              )
            )}
          </div>
        );
      })}

      {showAdd && (
        <div className="objection-card objection-card--open">
          <div className="objection-card__edit">
            <div className="manuscript-edit">
              <input
                className="manuscript-edit__title"
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Invändning, t.ex. 'Det låter bra men...'"
                autoFocus
              />
              <textarea
                className="manuscript-edit__content"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Skriv ditt svar på invändningen..."
                rows={4}
              />
              <div className="manuscript-edit__actions">
                <button className="btn btn--primary" onClick={handleSave} disabled={saving || !form.title.trim() || !form.content.trim()}>
                  {saving ? 'Sparar...' : 'Lägg till'}
                </button>
                <button className="btn btn--secondary" onClick={handleCancel}>Avbryt</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!showAdd && !editingId && (
        <button
          className="manuscript-add-btn"
          onClick={() => { setShowAdd(true); setForm(EMPTY_FORM); }}
        >
          + Lägg till invändning
        </button>
      )}
    </div>
  );
}
