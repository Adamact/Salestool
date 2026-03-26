import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

const PRESET_COLORS = [
  '#3b82f6', '#22c55e', '#ef4444', '#a855f7',
  '#eab308', '#14b8a6', '#f97316', '#ec4899',
];

export default function ListManager({ lists, onClose, onSelectList, onListsChange }) {
  const api = useApi();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setFormName('');
    setFormDesc('');
    setFormColor(PRESET_COLORS[0]);
    setShowForm(false);
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      await api.createList({ name: formName.trim(), description: formDesc.trim(), color: formColor });
      resetForm();
      onListsChange();
    } catch (err) {
      console.error('Failed to create list:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!formName.trim() || !editingId) return;
    setSaving(true);
    try {
      await api.updateList(editingId, { name: formName.trim(), description: formDesc.trim(), color: formColor });
      resetForm();
      onListsChange();
    } catch (err) {
      console.error('Failed to update list:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e, listId, listName) => {
    e.stopPropagation();
    if (!window.confirm(`Vill du verkligen ta bort listan "${listName}"?`)) return;
    try {
      await api.deleteList(listId);
      onListsChange();
    } catch (err) {
      console.error('Failed to delete list:', err);
    }
  };

  const startEdit = (e, list) => {
    e.stopPropagation();
    setEditingId(list.id);
    setFormName(list.name);
    setFormDesc(list.description || '');
    setFormColor(list.color || PRESET_COLORS[0]);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      handleUpdate();
    } else {
      handleCreate();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="list-manager" onClick={(e) => e.stopPropagation()}>
        <div className="list-manager__header">
          <h3>Listor</h3>
          <button className="modal__close" onClick={onClose}>&times;</button>
        </div>

        <div className="list-manager__actions">
          {!showForm && (
            <button
              className="btn btn--primary"
              onClick={() => { resetForm(); setShowForm(true); }}
            >
              + Skapa ny lista
            </button>
          )}
        </div>

        {showForm && (
          <form className="list-manager__form" onSubmit={handleSubmit}>
            <input
              className="list-manager__input"
              type="text"
              placeholder="Listnamn"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              autoFocus
            />
            <input
              className="list-manager__input"
              type="text"
              placeholder="Beskrivning (valfritt)"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
            />
            <div className="list-manager__color-picker">
              <span className="list-manager__color-label">Färg:</span>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`list-manager__color-dot ${formColor === c ? 'list-manager__color-dot--active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setFormColor(c)}
                />
              ))}
            </div>
            <div className="list-manager__form-actions">
              <button type="button" className="btn btn--secondary" onClick={resetForm}>Avbryt</button>
              <button type="submit" className="btn btn--primary" disabled={saving || !formName.trim()}>
                {saving ? 'Sparar...' : editingId ? 'Uppdatera' : 'Skapa'}
              </button>
            </div>
          </form>
        )}

        <div className="list-manager__list">
          {(!lists || lists.length === 0) && (
            <div className="list-manager__empty">Inga listor skapade ännu.</div>
          )}
          {(lists || []).map((list) => (
            <div
              key={list.id}
              className="list-manager__card"
              onClick={() => onSelectList(list.id)}
            >
              <div
                className="list-manager__card-dot"
                style={{ backgroundColor: list.color || '#6b7280' }}
              />
              <div className="list-manager__card-body">
                <div className="list-manager__card-name">{list.name}</div>
                {list.description && (
                  <div className="list-manager__card-desc">{list.description}</div>
                )}
                <div className="list-manager__card-count">
                  {list.lead_count ?? 0} leads
                </div>
              </div>
              <div className="list-manager__card-actions">
                <button
                  className="list-manager__icon-btn"
                  title="Redigera"
                  onClick={(e) => startEdit(e, list)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  className="list-manager__icon-btn list-manager__icon-btn--danger"
                  title="Ta bort"
                  onClick={(e) => handleDelete(e, list.id, list.name)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
