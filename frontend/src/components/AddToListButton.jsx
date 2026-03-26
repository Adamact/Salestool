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
    <div className="add-to-list" ref={ref}>
      <button
        className="btn btn--secondary add-to-list__trigger"
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
        <div className="add-to-list__dropdown">
          <div className="add-to-list__dropdown-header">Välj lista</div>

          {loading && <div className="add-to-list__loading">Laddar...</div>}

          {!loading && lists.length === 0 && (
            <div className="add-to-list__empty">Inga listor skapade.</div>
          )}

          {!loading && lists.map((list) => (
            <label key={list.id} className="add-to-list__item">
              <input
                type="checkbox"
                className="add-to-list__checkbox"
                checked={leadListIds.has(list.id)}
                onChange={() => handleToggle(list.id)}
                disabled={toggling.has(list.id)}
              />
              <span
                className="add-to-list__dot"
                style={{ backgroundColor: list.color || '#6b7280' }}
              />
              <span className="add-to-list__item-name">{list.name}</span>
              {toggling.has(list.id) && <span className="add-to-list__spinner" />}
            </label>
          ))}

          <div className="add-to-list__footer">
            {!showNewForm ? (
              <button
                className="add-to-list__new-link"
                onClick={() => setShowNewForm(true)}
              >
                + Ny lista...
              </button>
            ) : (
              <form className="add-to-list__new-form" onSubmit={handleCreateList}>
                <input
                  className="add-to-list__new-input"
                  type="text"
                  placeholder="Listnamn"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
                <button
                  type="submit"
                  className="btn btn--primary add-to-list__new-btn"
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
