import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import LeadCard from './LeadCard';
import CallbackQueue from './CallbackQueue';
import { STATUS_FILTER_OPTIONS as STATUS_OPTIONS } from '../constants/statuses';


const SORT_OPTIONS = [
  { value: '', label: 'Sortera...' },
  { value: 'company_asc', label: 'F\u00f6retag A-\u00d6', field: 'company', dir: 1 },
  { value: 'company_desc', label: 'F\u00f6retag \u00d6-A', field: 'company', dir: -1 },
  { value: 'contact_asc', label: 'Kontakt A-\u00d6', field: 'contact_name', dir: 1 },
  { value: 'contact_desc', label: 'Kontakt \u00d6-A', field: 'contact_name', dir: -1 },
  { value: 'city_asc', label: 'Stad A-\u00d6', field: 'city', dir: 1 },
  { value: 'city_desc', label: 'Stad \u00d6-A', field: 'city', dir: -1 },
  { value: 'industry_asc', label: 'Bransch A-\u00d6', field: 'industry', dir: 1 },
  { value: 'industry_desc', label: 'Bransch \u00d6-A', field: 'industry', dir: -1 },
  { value: 'status_asc', label: 'Status A-\u00d6', field: 'status', dir: 1 },
  { value: 'status_desc', label: 'Status \u00d6-A', field: 'status', dir: -1 },
];

export default function Sidebar({
  leads,
  selectedLeadId,
  onSelectLead,
  onImportClick,
  onAddLeadClick,
  lists,
  activeListId,
  onListSelect,
  onListManagerOpen,
  listLeadIds,
  onListsChange,
  onRemoveFromList,
}) {
  const api = useApi();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('alla');
  const [cityFilter, setCityFilter] = useState('');
  const [sortBy, setSortBy] = useState('');

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [showListDropdown, setShowListDropdown] = useState(false);
  const [adding, setAdding] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showListDropdown) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowListDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showListDropdown]);

  const cities = useMemo(() => {
    const set = new Set();
    (leads || []).forEach((l) => { if (l.city) set.add(l.city); });
    return Array.from(set).sort();
  }, [leads]);

  const filtered = useMemo(() => {
    let list = leads || [];
    if (activeListId && listLeadIds) {
      list = list.filter((l) => listLeadIds.has(l.id));
    }
    if (statusFilter !== 'alla') {
      list = list.filter((l) => l.status === statusFilter);
    }
    if (cityFilter) {
      list = list.filter((l) => l.city === cityFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((l) =>
        (l.company || '').toLowerCase().includes(q) ||
        (l.contact_name || '').toLowerCase().includes(q) ||
        (l.phone || '').toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        (l.industry || '').toLowerCase().includes(q)
      );
    }
    if (sortBy) {
      const opt = SORT_OPTIONS.find((o) => o.value === sortBy);
      if (opt) {
        list = [...list].sort((a, b) => {
          const aVal = (a[opt.field] || '').toLowerCase();
          const bVal = (b[opt.field] || '').toLowerCase();
          return aVal.localeCompare(bVal, 'sv') * opt.dir;
        });
      }
    }
    return list;
  }, [leads, statusFilter, cityFilter, search, activeListId, listLeadIds, sortBy]);

  const activeList = activeListId ? (lists || []).find((l) => l.id === activeListId) : null;

  const handleToggleCheck = (id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (checkedIds.size === filtered.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(filtered.map((l) => l.id)));
    }
  };

  const handleExitSelectMode = () => {
    setSelectMode(false);
    setCheckedIds(new Set());
    setShowListDropdown(false);
  };

  const handleAddToList = async (listId) => {
    if (checkedIds.size === 0) return;
    setAdding(true);
    try {
      await api.addToList(listId, { lead_ids: Array.from(checkedIds) });
      setShowListDropdown(false);
      handleExitSelectMode();
      if (onListsChange) onListsChange();
    } catch (err) {
      console.error('Failed to add leads to list:', err);
    } finally {
      setAdding(false);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <h2 className="sidebar__title">Leads</h2>
        <div className="sidebar__header-btns">
          {!selectMode && (
            <button
              className="sidebar__import-btn"
              onClick={() => setSelectMode(true)}
              title="V\u00e4lj flera"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
            </button>
          )}
          {selectMode && (
            <button
              className="sidebar__import-btn sidebar__import-btn--active"
              onClick={handleExitSelectMode}
              title="Avbryt val"
            >
              {'\u2715'}
            </button>
          )}
          <button className="sidebar__import-btn" onClick={onListManagerOpen} title="Hantera listor">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
          <button className="sidebar__import-btn" onClick={onAddLeadClick} title="Lägg till lead">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <button className="sidebar__import-btn" onClick={onImportClick} title="Importera Excel">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </button>
          <button className="sidebar__import-btn" onClick={() => api.exportLeads({ status: statusFilter !== 'alla' ? statusFilter : undefined, listId: activeListId || undefined })} title="Exportera CSV">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
        </div>
      </div>

      {activeList && (
        <div className="sidebar__list-banner" style={{ borderLeftColor: activeList.color || '#3b82f6' }}>
          <div className="sidebar__list-banner-info">
            <span className="sidebar__list-banner-dot" style={{ backgroundColor: activeList.color || '#3b82f6' }} />
            <span className="sidebar__list-banner-name">{activeList.name}</span>
          </div>
          <button className="sidebar__list-banner-clear" onClick={() => onListSelect(null)}>
            {'\u2715'}
          </button>
        </div>
      )}

      <div className="sidebar__filters">
        <input
          className="sidebar__search"
          type="text"
          placeholder="S\u00f6k f\u00f6retag, kontakt, bransch..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="sidebar__filter-row">
          <select
            className="sidebar__select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            className="sidebar__select"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
          >
            <option value="">Alla st{'\u00e4'}der</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <select
          className="sidebar__select sidebar__select--sort"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Select all bar */}
      {selectMode && (
        <div className="sidebar__select-bar">
          <button className="sidebar__select-all" onClick={handleSelectAll}>
            {checkedIds.size === filtered.length ? 'Avmarkera alla' : 'V\u00e4lj alla'}
          </button>
          <span className="sidebar__select-count">{checkedIds.size} valda</span>
        </div>
      )}

      <CallbackQueue onSelectLead={onSelectLead} />

      <div className="sidebar__list">
        {filtered.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            selected={lead.id === selectedLeadId}
            onClick={() => onSelectLead(lead.id)}
            selectMode={selectMode}
            isChecked={checkedIds.has(lead.id)}
            onToggleCheck={handleToggleCheck}
            showRemove={!!activeListId}
            onRemove={onRemoveFromList}
          />
        ))}
        {filtered.length === 0 && (
          <div className="sidebar__empty">Inga leads hittades</div>
        )}
      </div>

      {/* Floating action bar when items are checked */}
      {selectMode && checkedIds.size > 0 && (
        <div className="sidebar__action-bar" ref={dropdownRef}>
          {showListDropdown && (
            <div className="sidebar__list-picker">
              <div className="sidebar__list-picker-title">L{'\u00e4'}gg till i lista</div>
              {(lists || []).length === 0 && (
                <div className="sidebar__list-picker-empty">
                  Inga listor. Skapa en f{'\u00f6'}rst.
                </div>
              )}
              {(lists || []).map((list) => (
                <button
                  key={list.id}
                  className="sidebar__list-picker-item"
                  onClick={() => handleAddToList(list.id)}
                  disabled={adding}
                >
                  <span className="sidebar__list-picker-dot" style={{ backgroundColor: list.color || '#6b7280' }} />
                  <span>{list.name}</span>
                  <span className="sidebar__list-picker-count">{list.lead_count ?? 0}</span>
                </button>
              ))}
            </div>
          )}
          <button
            className="sidebar__action-btn"
            onClick={() => setShowListDropdown((p) => !p)}
            disabled={adding}
          >
            {adding ? 'L\u00e4gger till...' : `L\u00e4gg ${checkedIds.size} leads i lista`}
          </button>
        </div>
      )}

      <div className="sidebar__footer">
        {filtered.length} av {(leads || []).length} leads
      </div>
    </aside>
  );
}
