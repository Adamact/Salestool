import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';

const EMPTY_FORM = { title: '', content: '' };

const SECTION_TYPES = [
  { value: 'opening', label: '\u00d6ppning' },
  { value: 'value_prop', label: 'V\u00e4rdeerbjudande' },
  { value: 'questions', label: 'Fr\u00e5gor' },
  { value: 'closing', label: 'Avslut' },
  { value: 'other', label: '\u00d6vrigt' },
];

function ScriptSide({ manuscript, onManuscriptChange }) {
  const api = useApi();
  const sections = (manuscript || []).filter((s) => s.section_type !== 'objection');

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [newType, setNewType] = useState('opening');
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
        const maxOrder = (manuscript || []).reduce((max, s) => Math.max(max, s.sort_order || 0), 0);
        await api.createManuscript({
          section_type: newType,
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

  const getTypeLabel = (type) => {
    const found = SECTION_TYPES.find((t) => t.value === type);
    return found ? found.label : type;
  };

  return (
    <div className="script-panel">
      <h3 className="split-panel__heading">Manus</h3>

      {sections.length === 0 && !showAdd && (
        <p className="script-panel__empty">Inget manus har lagts till {'\u00e4'}nnu.</p>
      )}

      {sections.map((section) => (
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
                placeholder="Skriv ditt manus h{'\u00e4'}r..."
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
                <div className="script-section__title-row">
                  <span className="script-section__type-tag">{getTypeLabel(section.section_type)}</span>
                  {section.title && <h4 className="script-section__title">{section.title}</h4>}
                </div>
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
          <select
            className="manuscript-edit__type-select"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
          >
            {SECTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input
            className="manuscript-edit__title"
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Titel"
            autoFocus
          />
          <textarea
            className="manuscript-edit__content"
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="Skriv ditt manus h{'\u00e4'}r..."
            rows={6}
          />
          <div className="manuscript-edit__actions">
            <button className="btn btn--primary" onClick={handleSave} disabled={saving || !form.title.trim() || !form.content.trim()}>
              {saving ? 'Sparar...' : 'L\u00e4gg till'}
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
          + L{'\u00e4'}gg till manus
        </button>
      )}
    </div>
  );
}

function ObjectionsSide({ manuscript, onManuscriptChange }) {
  const api = useApi();
  const objections = (manuscript || []).filter((s) => s.section_type === 'objection');

  const [openId, setOpenId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleEdit = (e, obj) => {
    e.stopPropagation();
    setEditingId(obj.id);
    setOpenId(obj.id);
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
      if (openId === id) setOpenId(null);
      if (onManuscriptChange) onManuscriptChange();
    } catch (err) {
      console.error('Failed to delete objection:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="objections-panel">
      <h3 className="split-panel__heading">Inv{'\u00e4'}ndningar</h3>

      {objections.length === 0 && !showAdd && (
        <p className="objections-panel__empty">Inga inv{'\u00e4'}ndningar har lagts till {'\u00e4'}nnu.</p>
      )}

      {objections.map((obj) => {
        const isOpen = openId === obj.id;
        const isEditing = editingId === obj.id;

        return (
          <div key={obj.id} className={`objection-card ${isOpen ? 'objection-card--open' : ''}`}>
            <button
              className="objection-card__header"
              onClick={() => { if (!isEditing) setOpenId(isOpen ? null : obj.id); }}
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
                      placeholder="Inv\u00e4ndning, t.ex. 'Vi har redan en leverant\u00f6r'"
                    />
                    <textarea
                      className="manuscript-edit__content"
                      value={form.content}
                      onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                      placeholder="Skriv ditt svar p\u00e5 inv\u00e4ndningen..."
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
                placeholder="Inv\u00e4ndning, t.ex. 'Det l\u00e5ter bra men...'"
                autoFocus
              />
              <textarea
                className="manuscript-edit__content"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Skriv ditt svar p\u00e5 inv\u00e4ndningen..."
                rows={4}
              />
              <div className="manuscript-edit__actions">
                <button className="btn btn--primary" onClick={handleSave} disabled={saving || !form.title.trim() || !form.content.trim()}>
                  {saving ? 'Sparar...' : 'L\u00e4gg till'}
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
          + L{'\u00e4'}gg till inv{'\u00e4'}ndning
        </button>
      )}
    </div>
  );
}

export default function ManuscriptSplitPanel({ manuscript, onManuscriptChange }) {
  return (
    <div className="manuscript-split">
      <div className="manuscript-split__left">
        <ScriptSide manuscript={manuscript} onManuscriptChange={onManuscriptChange} />
      </div>
      <div className="manuscript-split__divider" />
      <div className="manuscript-split__right">
        <ObjectionsSide manuscript={manuscript} onManuscriptChange={onManuscriptChange} />
      </div>
    </div>
  );
}
