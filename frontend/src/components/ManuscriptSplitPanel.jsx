import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';

const EMPTY_FORM = { title: '', content: '' };

const SECTION_TYPES = [
  { value: 'opening', label: 'Öppning' },
  { value: 'value_prop', label: 'Värdeerbjudande' },
  { value: 'questions', label: 'Frågor' },
  { value: 'closing', label: 'Avslut' },
  { value: 'other', label: 'Övrigt' },
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
    <div>
      <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Manus</h3>

      {sections.length === 0 && !showAdd && (
        <p className="text-sm text-slate-400 py-4">Inget manus har lagts till ännu.</p>
      )}

      {sections.map((section) => (
        <div key={section.id} className="rounded-lg border border-slate-200 p-4 mb-4 shadow-sm">
          {editingId === section.id ? (
            <div className="space-y-3">
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-accent/30 focus:outline-none"
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Titel"
              />
              <textarea
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-accent/30 focus:outline-none resize-y"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Skriv ditt manus här..."
                rows={6}
              />
              <div className="flex gap-2">
                <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Sparar...' : 'Spara'}
                </button>
                <button className="btn btn--secondary" onClick={handleCancel}>Avbryt</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-accent/10 text-accent px-2 py-0.5 rounded-full w-fit">{getTypeLabel(section.section_type)}</span>
                  {section.title && <h4 className="text-base font-medium text-slate-900">{section.title}</h4>}
                </div>
                <div className="flex gap-1">
                  <button className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:bg-slate-100" onClick={() => handleEdit(section)} title="Redigera">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleDelete(section.id)} title="Ta bort">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="text-base text-slate-600 whitespace-pre-wrap mt-2 leading-relaxed">{section.content}</div>
            </>
          )}
        </div>
      ))}

      {showAdd && (
        <div className="space-y-3">
          <select
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
          >
            {SECTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-accent/30 focus:outline-none"
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Titel"
            autoFocus
          />
          <textarea
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-accent/30 focus:outline-none resize-y"
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="Skriv ditt manus här..."
            rows={6}
          />
          <div className="flex gap-2">
            <button className="btn btn--primary" onClick={handleSave} disabled={saving || !form.title.trim() || !form.content.trim()}>
              {saving ? 'Sparar...' : 'Lägg till'}
            </button>
            <button className="btn btn--secondary" onClick={handleCancel}>Avbryt</button>
          </div>
        </div>
      )}

      {!showAdd && !editingId && (
        <button
          className="w-full border-2 border-dashed border-slate-200 rounded-lg py-2.5 text-sm text-slate-500 hover:border-accent hover:text-accent transition-colors"
          onClick={() => { setShowAdd(true); setForm(EMPTY_FORM); }}
        >
          + Lägg till manus
        </button>
      )}
    </div>
  );
}

function ObjectionsSide({ manuscript, onManuscriptChange }) {
  const api = useApi();
  const objections = (manuscript || []).filter((s) => s.section_type === 'objection');

  const [closedIds, setClosedIds] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

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
    <div>
      <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Invändningar</h3>

      {objections.length === 0 && !showAdd && (
        <p className="text-sm text-slate-400 py-4">Inga invändningar har lagts till ännu.</p>
      )}

      {objections.map((obj) => {
        const isOpen = !closedIds.has(obj.id);
        const isEditing = editingId === obj.id;

        return (
          <div key={obj.id} className="rounded-lg border border-slate-200 mb-3 shadow-sm">
            <button
              className="w-full flex justify-between items-center px-4 py-3 cursor-pointer hover:bg-slate-50 text-left"
              onClick={() => { if (!isEditing) toggleOne(obj.id); }}
              aria-expanded={isOpen}
            >
              <span className="text-base font-medium text-slate-900">{isEditing ? form.title || obj.title : obj.title}</span>
              <span className="flex items-center gap-1">
                {isOpen && !isEditing && (
                  <>
                    <span className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:bg-slate-100" onClick={(e) => handleEdit(e, obj)} title="Redigera">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </span>
                    <span className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={(e) => handleDelete(e, obj.id)} title="Ta bort">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </span>
                  </>
                )}
                <span className="text-slate-400 text-xs">{isOpen ? '\u25B2' : '\u25BC'}</span>
              </span>
            </button>
            {isOpen && (
              isEditing ? (
                <div className="px-4 pb-3">
                  <div className="space-y-3">
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-accent/30 focus:outline-none"
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Invändning, t.ex. 'Vi har redan en leverantör'"
                    />
                    <textarea
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-accent/30 focus:outline-none resize-y"
                      value={form.content}
                      onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                      placeholder="Skriv ditt svar på invändningen..."
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <button className="btn btn--primary" onClick={handleSave} disabled={saving || !form.title.trim() || !form.content.trim()}>
                        {saving ? 'Sparar...' : 'Spara'}
                      </button>
                      <button className="btn btn--secondary" onClick={handleCancel}>Avbryt</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-4 pb-3 text-base text-slate-600 whitespace-pre-wrap leading-relaxed">{obj.content}</div>
              )
            )}
          </div>
        );
      })}

      {showAdd && (
        <div className="rounded-lg border border-slate-200 mb-3 shadow-sm">
          <div className="px-4 py-3">
            <div className="space-y-3">
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-accent/30 focus:outline-none"
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Invändning, t.ex. 'Det låter bra men...'"
                autoFocus
              />
              <textarea
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-accent/30 focus:outline-none resize-y"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Skriv ditt svar på invändningen..."
                rows={4}
              />
              <div className="flex gap-2">
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
          className="w-full border-2 border-dashed border-slate-200 rounded-lg py-2.5 text-sm text-slate-500 hover:border-accent hover:text-accent transition-colors"
          onClick={() => { setShowAdd(true); setForm(EMPTY_FORM); }}
        >
          + Lägg till invändning
        </button>
      )}
    </div>
  );
}

function ManuscriptGroupSelector({ manuscriptGroups, activeManuscriptId, onManuscriptGroupChange, onActiveManuscriptChange }) {
  const api = useApi();
  const [showMenu, setShowMenu] = useState(false);

  const handleSwitch = async (e) => {
    const id = Number(e.target.value);
    try {
      await api.activateManuscriptGroup(id);
      onActiveManuscriptChange(id);
      if (onManuscriptGroupChange) onManuscriptGroupChange();
    } catch (err) {
      console.error('Failed to switch manuscript:', err);
    }
  };

  const handleCreate = async () => {
    const name = window.prompt('Namn på nytt manus:');
    if (!name || !name.trim()) return;
    try {
      const group = await api.createManuscriptGroup({ name: name.trim() });
      await api.activateManuscriptGroup(group.id);
      onActiveManuscriptChange(group.id);
      if (onManuscriptGroupChange) onManuscriptGroupChange();
    } catch (err) {
      console.error('Failed to create manuscript group:', err);
    }
  };

  const handleRename = async () => {
    setShowMenu(false);
    const current = manuscriptGroups.find((g) => g.id === activeManuscriptId);
    const name = window.prompt('Nytt namn:', current?.name || '');
    if (!name || !name.trim()) return;
    try {
      await api.updateManuscriptGroup(activeManuscriptId, { name: name.trim() });
      if (onManuscriptGroupChange) onManuscriptGroupChange();
    } catch (err) {
      console.error('Failed to rename manuscript group:', err);
    }
  };

  const handleDuplicate = async () => {
    setShowMenu(false);
    try {
      const group = await api.duplicateManuscriptGroup(activeManuscriptId);
      await api.activateManuscriptGroup(group.id);
      onActiveManuscriptChange(group.id);
      if (onManuscriptGroupChange) onManuscriptGroupChange();
    } catch (err) {
      console.error('Failed to duplicate manuscript group:', err);
    }
  };

  const handleDelete = async () => {
    setShowMenu(false);
    const current = manuscriptGroups.find((g) => g.id === activeManuscriptId);
    if (!window.confirm(`Ta bort "${current?.name}"? Alla sektioner i detta manus raderas.`)) return;
    try {
      await api.deleteManuscriptGroup(activeManuscriptId);
      if (onManuscriptGroupChange) onManuscriptGroupChange();
    } catch (err) {
      alert(err.message || 'Kan inte ta bort det sista manuset.');
    }
  };

  return (
    <div className="flex items-center gap-2 mb-4">
      <select
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
        value={activeManuscriptId || ''}
        onChange={handleSwitch}
      >
        {(manuscriptGroups || []).map((g) => (
          <option key={g.id} value={g.id}>{g.name}</option>
        ))}
      </select>
      <button className="h-8 w-8 rounded-lg bg-accent text-white flex items-center justify-center text-sm font-bold" onClick={handleCreate} title="Nytt manus">+</button>
      <div className="relative">
        <button className="h-8 w-8 rounded-lg bg-accent text-white flex items-center justify-center text-sm font-bold" onClick={() => setShowMenu((s) => !s)} title="Fler alternativ">...</button>
        {showMenu && (
          <div className="absolute top-full right-0 mt-1 bg-white shadow-lg rounded-lg border border-slate-100 py-1 z-10">
            <button className="w-full px-3 py-2 text-sm text-left hover:bg-slate-50" onClick={handleRename}>Byt namn</button>
            <button className="w-full px-3 py-2 text-sm text-left hover:bg-slate-50" onClick={handleDuplicate}>Duplicera</button>
            <button className="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 text-red-600" onClick={handleDelete}>Ta bort</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ManuscriptSplitPanel({ manuscript, onManuscriptChange, manuscriptGroups, activeManuscriptId, onManuscriptGroupChange, onActiveManuscriptChange }) {
  return (
    <div>
      <ManuscriptGroupSelector
        manuscriptGroups={manuscriptGroups}
        activeManuscriptId={activeManuscriptId}
        onManuscriptGroupChange={onManuscriptGroupChange}
        onActiveManuscriptChange={onActiveManuscriptChange}
      />
      <div className="flex gap-4">
        <div className="flex-1">
          <ScriptSide manuscript={manuscript} onManuscriptChange={onManuscriptChange} />
        </div>
        <div className="w-px bg-slate-200" />
        <div className="flex-1">
          <ObjectionsSide manuscript={manuscript} onManuscriptChange={onManuscriptChange} />
        </div>
      </div>
    </div>
  );
}
