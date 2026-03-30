import React, { useState, useEffect, useRef, useMemo } from 'react';
import clsx from 'clsx';

const ACTIONS = [
  { id: 'log-call', label: 'Logga samtal', shortcut: 'Enter', icon: 'phone', category: 'Snabbkommandon' },
  { id: 'next-lead', label: 'Nästa lead', shortcut: 'N', icon: 'arrow-right', category: 'Snabbkommandon' },
  { id: 'add-lead', label: 'Lägg till lead', icon: 'plus', category: 'Åtgärder' },
  { id: 'import', label: 'Importera Excel', icon: 'upload', category: 'Åtgärder' },
  { id: 'lists', label: 'Hantera listor', icon: 'list', category: 'Åtgärder' },
  { id: 'calendar', label: 'Öppna kalender', icon: 'calendar', category: 'Åtgärder' },
  { id: 'analytics', label: 'Visa analys', icon: 'chart', category: 'Åtgärder' },
  { id: 'toggle-script', label: 'Visa/dölj manus', icon: 'document', category: 'Åtgärder' },
  { id: 'power-dial', label: 'Toggle Power Dial', icon: 'bolt', category: 'Åtgärder' },
  { id: 'settings', label: 'Installningar', icon: 'settings', category: 'Åtgärder' },
];

const ICONS = {
  phone: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
    </svg>
  ),
  'arrow-right': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  upload: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  list: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  calendar: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  chart: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  document: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  bolt: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
};

export default function CommandPalette({ open, onClose, leads, onAction }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Filter results
  const results = useMemo(() => {
    const items = [];
    const q = query.toLowerCase().trim();

    // Search leads
    if (q.length >= 2) {
      const matchedLeads = (leads || [])
        .filter((l) =>
          (l.company || '').toLowerCase().includes(q) ||
          (l.contact_name || '').toLowerCase().includes(q) ||
          (l.phone || '').toLowerCase().includes(q)
        )
        .slice(0, 5);

      matchedLeads.forEach((l) => {
        items.push({
          id: `lead-${l.id}`,
          type: 'lead',
          label: l.company || 'Okänt',
          sublabel: l.contact_name || l.phone || '',
          leadId: l.id,
          category: 'Leads',
        });
      });
    }

    // Filter actions
    const matchedActions = q
      ? ACTIONS.filter((a) => a.label.toLowerCase().includes(q))
      : ACTIONS;

    matchedActions.forEach((a) => items.push({ ...a, type: 'action' }));

    return items;
  }, [query, leads]);

  // Keep selectedIndex in range
  useEffect(() => {
    if (selectedIndex >= results.length) {
      setSelectedIndex(Math.max(0, results.length - 1));
    }
  }, [results.length, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[selectedIndex];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = results[selectedIndex];
        if (item) executeItem(item);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, results, selectedIndex]);

  const executeItem = (item) => {
    onClose();
    if (item.type === 'lead') {
      onAction('select-lead', item.leadId);
    } else {
      onAction(item.id);
    }
  };

  if (!open) return null;

  // Group results by category
  let lastCategory = '';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <span className="text-slate-400">{ICONS.search}</span>
          <input
            ref={inputRef}
            className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 outline-none bg-transparent"
            placeholder="Sök leads eller välj åtgärd..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
          />
          <kbd className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-72 overflow-y-auto py-1 scrollbar-light">
          {results.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-400">Inga resultat</div>
          )}
          {results.map((item, idx) => {
            const showCategory = item.category !== lastCategory;
            lastCategory = item.category;

            return (
              <React.Fragment key={item.id}>
                {showCategory && (
                  <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    {item.category}
                  </div>
                )}
                <button
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors',
                    idx === selectedIndex ? 'bg-accent/10 text-accent' : 'text-slate-700 hover:bg-slate-50'
                  )}
                  onClick={() => executeItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <span className={clsx('flex-shrink-0', idx === selectedIndex ? 'text-accent' : 'text-slate-400')}>
                    {item.type === 'lead' ? ICONS.search : ICONS[item.icon]}
                  </span>
                  <span className="flex-1 min-w-0 truncate">{item.label}</span>
                  {item.sublabel && (
                    <span className="text-xs text-slate-400 truncate max-w-[120px]">{item.sublabel}</span>
                  )}
                  {item.shortcut && (
                    <kbd className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono ml-2">
                      {item.shortcut}
                    </kbd>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-100 text-[10px] text-slate-400">
          <span><kbd className="bg-slate-100 px-1 py-0.5 rounded font-mono">{'\u2191\u2193'}</kbd> navigera</span>
          <span><kbd className="bg-slate-100 px-1 py-0.5 rounded font-mono">Enter</kbd> välj</span>
          <span><kbd className="bg-slate-100 px-1 py-0.5 rounded font-mono">Esc</kbd> stäng</span>
        </div>
      </div>
    </div>
  );
}
