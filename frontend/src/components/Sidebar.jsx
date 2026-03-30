import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { useApi } from '../hooks/useApi';
import LeadCard from './LeadCard';
import CallbackQueue from './CallbackQueue';
import { STATUS_FILTER_OPTIONS as STATUS_OPTIONS } from '../constants/statuses';

const SORT_OPTIONS = [
  { value: '', label: 'Sortera...' },
  { value: 'company_asc', label: 'Företag A-Ö', field: 'company', dir: 1 },
  { value: 'company_desc', label: 'Företag Ö-A', field: 'company', dir: -1 },
  { value: 'contact_asc', label: 'Kontakt A-Ö', field: 'contact_name', dir: 1 },
  { value: 'contact_desc', label: 'Kontakt Ö-A', field: 'contact_name', dir: -1 },
  { value: 'city_asc', label: 'Stad A-Ö', field: 'city', dir: 1 },
  { value: 'city_desc', label: 'Stad Ö-A', field: 'city', dir: -1 },
  { value: 'industry_asc', label: 'Bransch A-Ö', field: 'industry', dir: 1 },
  { value: 'industry_desc', label: 'Bransch Ö-A', field: 'industry', dir: -1 },
  { value: 'status_asc', label: 'Status A-Ö', field: 'status', dir: 1 },
  { value: 'status_desc', label: 'Status Ö-A', field: 'status', dir: -1 },
];

const MIN_WIDTH = 320;
const MAX_WIDTH = 520;
const DEFAULT_WIDTH = 380;

function getStoredWidth() {
  try {
    const w = parseInt(localStorage.getItem('sidebar-width'));
    return w >= MIN_WIDTH && w <= MAX_WIDTH ? w : DEFAULT_WIDTH;
  } catch { return DEFAULT_WIDTH; }
}

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
  const [width, setWidth] = useState(getStoredWidth);
  const [isResizing, setIsResizing] = useState(false);

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [showListDropdown, setShowListDropdown] = useState(false);
  const [adding, setAdding] = useState(false);
  const dropdownRef = useRef(null);

  // Resize handling
  const cleanupResizeRef = useRef(null);

  useEffect(() => {
    return () => {
      if (cleanupResizeRef.current) cleanupResizeRef.current();
    };
  }, []);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (e) => {
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + (e.clientX - startX)));
      setWidth(newWidth);
    };

    const cleanup = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', cleanup);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      cleanupResizeRef.current = null;
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', cleanup);
    cleanupResizeRef.current = cleanup;
  }, [width]);

  // Persist width
  useEffect(() => {
    localStorage.setItem('sidebar-width', String(width));
  }, [width]);

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
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'sv'));
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

  const iconBtnClass = 'flex items-center justify-center w-10 h-10 rounded-lg bg-white/8 text-sidebar-text hover:bg-white/15 hover:text-sidebar-text-bright transition-colors cursor-pointer';

  return (
    <div className="relative flex">
      <aside
        className="flex flex-col bg-sidebar-bg text-sidebar-text"
        style={{ width, minWidth: width }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3 gap-3">
          <h2 className="text-lg font-semibold text-sidebar-text-bright flex-shrink-0">Leads</h2>
          <div className="flex gap-2 flex-shrink-0">
            {!selectMode ? (
              <button className={iconBtnClass} onClick={() => setSelectMode(true)} title="Välj flera">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 11 12 14 22 4" />
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </svg>
              </button>
            ) : (
              <button className={clsx(iconBtnClass, 'bg-white/20 text-sidebar-text-bright')} onClick={handleExitSelectMode} title="Avbryt val">
                {'\u2715'}
              </button>
            )}
            <button className={iconBtnClass} onClick={onListManagerOpen} title="Hantera listor">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            <button className={iconBtnClass} onClick={onAddLeadClick} title="Lägg till lead">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
            <button className={iconBtnClass} onClick={onImportClick} title="Importera Excel">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </button>
            <button className={iconBtnClass} onClick={() => api.exportLeads({ status: statusFilter !== 'alla' ? statusFilter : undefined, listId: activeListId || undefined })} title="Exportera CSV">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Active list banner */}
        {activeList && (
          <div
            className="mx-3 mb-2 flex items-center justify-between rounded-r-md bg-white/6 px-3 py-2.5 border-l-[3px]"
            style={{ borderLeftColor: activeList.color || '#6366f1' }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: activeList.color || '#6366f1' }} />
              <span className="text-sm font-medium text-sidebar-text-bright truncate">{activeList.name}</span>
            </div>
            <button
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              onClick={() => onListSelect(null)}
            >
              {'\u2715'}
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="px-4 py-3 space-y-3">
          {/* Search */}
          <div className="relative">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} className="text-slate-500 pointer-events-none">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              style={{ paddingLeft: '42px' }}
              className="w-full rounded-lg bg-white/8 border border-white/10 pr-9 py-2.5 text-sm text-sidebar-text-bright placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-shadow"
              type="text"
              placeholder="Sök företag, kontakt, bransch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
                onClick={() => setSearch('')}
              >
                {'\u2715'}
              </button>
            )}
          </div>

          {/* Filter row */}
          <div className="flex gap-2.5">
            <select
              className="flex-1 min-w-0 rounded-lg bg-white/8 border border-white/10 px-3 py-2.5 text-sm text-sidebar-text focus:outline-none focus:ring-1 focus:ring-accent/50"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              className="flex-1 min-w-0 rounded-lg bg-white/8 border border-white/10 px-3 py-2.5 text-sm text-sidebar-text focus:outline-none focus:ring-1 focus:ring-accent/50"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
            >
              <option value="">Alla städer</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <select
            className="w-full rounded-lg bg-white/8 border border-white/10 px-3 py-2.5 text-sm text-sidebar-text focus:outline-none focus:ring-1 focus:ring-accent/50"
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
          <div className="flex items-center justify-between px-4 py-2.5 bg-accent/10 border-y border-accent/20">
            <button
              className="text-sm font-medium text-accent hover:underline"
              onClick={handleSelectAll}
            >
              {checkedIds.size === filtered.length ? 'Avmarkera alla' : 'Välj alla'}
            </button>
            <span className="text-sm text-slate-400">{checkedIds.size} valda</span>
          </div>
        )}

        <CallbackQueue onSelectLead={onSelectLead} />

        {/* Lead list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1.5 px-3 py-2">
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
            <div className="py-8 text-center text-sm text-slate-500">Inga leads hittades</div>
          )}
        </div>

        {/* Floating action bar when items are checked */}
        {selectMode && checkedIds.size > 0 && (
          <div className="relative p-3" ref={dropdownRef}>
            {showListDropdown && (
              <div className="absolute bottom-full left-3 right-3 mb-1 rounded-lg bg-sidebar-hover border border-white/10 shadow-lg overflow-hidden animate-slide-up">
                <div className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-slate-400 border-b border-white/10">
                  Lägg till i lista
                </div>
                {(lists || []).length === 0 && (
                  <div className="px-3 py-3 text-xs text-slate-500">Inga listor. Skapa en först.</div>
                )}
                {(lists || []).map((list) => (
                  <button
                    key={list.id}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-sidebar-text hover:bg-white/10 transition-colors disabled:opacity-50"
                    onClick={() => handleAddToList(list.id)}
                    disabled={adding}
                  >
                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: list.color || '#6b7280' }} />
                    <span className="flex-1 text-left truncate">{list.name}</span>
                    <span className="text-xs text-slate-500">{list.lead_count ?? 0}</span>
                  </button>
                ))}
              </div>
            )}
            <button
              className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
              onClick={() => setShowListDropdown((p) => !p)}
              disabled={adding}
            >
              {adding ? 'Lägger till...' : `Lägg ${checkedIds.size} leads i lista`}
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 text-xs text-slate-500 border-t border-white/5">
          {filtered.length} av {(leads || []).length} leads
        </div>
      </aside>

      {/* Resize handle */}
      <div
        className={clsx(
          'w-1 cursor-col-resize hover:bg-accent/30 transition-colors flex-shrink-0',
          isResizing && 'bg-accent/40'
        )}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
