import React, { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';

export default function AddToListButton({ leadId, onAdded }) {
  const api = useApi();
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState([]);
  const [leadListIds, setLeadListIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(new Set());
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Fetch lists and lead memberships when dropdown opens
  useEffect(() => {
    if (!open || !leadId) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([api.getLists(), api.getListsForLead(leadId)])
      .then(([allLists, memberLists]) => {
        if (cancelled) return;
        setLists(allLists || []);
        const ids = new Set((memberLists || []).map((l) => l.id));
        setLeadListIds(ids);
      })
      .catch((err) => console.error('Failed to load lists:', err))
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [open, leadId, api]);

  const handleToggle = async (listId) => {
    if (toggling.has(listId)) return;
    setToggling((prev) => new Set(prev).add(listId));

    try {
      if (leadListIds.has(listId)) {
        await api.removeFromList(listId, leadId);
        setLeadListIds((prev) => {
          const next = new Set(prev);
          next.delete(listId);
          return next;
        });
      } else {
        await api.addToList(listId, { lead_ids: [leadId] });
        setLeadListIds((prev) => new Set(prev).add(listId));
      }
      if (onAdded) onAdded();
    } catch (err) {
      console.error('Failed to toggle list membership:', err);
    } finally {
      setToggling((prev) => {
        const next = new Set(prev);
        next.delete(listId);
        return next;
      });
    }
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await api.createList({ name: newName.trim() });
      setLists((prev) => [...prev, created]);
      setNewName('');
      setShowNewForm(false);
      // Auto-add lead to the new list
      if (created && created.id) {
        await api.addToList(created.id, { lead_ids: [leadId] });
        setLeadListIds((prev) => new Set(prev).add(created.id));
        if (onAdded) onAdded();
      }
    } catch (err) {
      console.error('Failed to create list:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 flex items-center gap-1.5 hover:bg-slate-50 transition-colors"
        onClick={() => setOpen((prev) => !prev)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
        Lägg till i lista
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-slate-100 z-20 animate-fade-in">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">Välj lista</div>

          {loading && <div className="px-3 py-3 text-xs text-slate-400">Laddar...</div>}

          {!loading && lists.length === 0 && (
            <div className="px-3 py-3 text-xs text-slate-400">Inga listor skapade.</div>
          )}

          {!loading && lists.map((list) => (
            <label key={list.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-sm">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded accent-accent"
                checked={leadListIds.has(list.id)}
                onChange={() => handleToggle(list.id)}
                disabled={toggling.has(list.id)}
              />
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: list.color || '#6b7280' }}
              />
              <span className="text-slate-700">{list.name}</span>
              {toggling.has(list.id) && <span className="h-3 w-3 animate-spin border-2 border-slate-300 border-t-accent rounded-full" />}
            </label>
          ))}

          <div className="px-3 py-2 border-t border-slate-100">
            {!showNewForm ? (
              <button
                className="text-xs text-accent hover:underline"
                onClick={() => setShowNewForm(true)}
              >
                + Ny lista...
              </button>
            ) : (
              <form className="flex gap-1" onSubmit={handleCreateList}>
                <input
                  className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs"
                  type="text"
                  placeholder="Listnamn"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
                <button
                  type="submit"
                  className="bg-accent text-white rounded px-2 py-1 text-xs"
                  disabled={creating || !newName.trim()}
                >
                  {creating ? '...' : 'OK'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
