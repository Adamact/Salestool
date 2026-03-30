import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';

export default function FloatingScript({ manuscript, onClose, manuscriptGroups, activeManuscriptId, onActiveManuscriptChange }) {
  const api = useApi();
  const [collapsed, setCollapsed] = useState({});

  const scripts = (manuscript || []).filter((s) => s.section_type !== 'objection');
  const objections = (manuscript || []).filter((s) => s.section_type === 'objection');

  const toggle = (id) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleSwitch = async (e) => {
    const id = Number(e.target.value);
    try {
      await api.activateManuscriptGroup(id);
      onActiveManuscriptChange(id);
    } catch (err) {
      console.error('Failed to switch manuscript:', err);
    }
  };

  return (
    <div className="fixed right-4 top-20 bottom-4 w-80 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col z-40 animate-slide-in-right">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="font-semibold text-slate-900 text-sm">Manus</span>
        {manuscriptGroups && manuscriptGroups.length > 1 && (
          <select
            className="rounded border border-slate-200 px-2 py-1 text-xs"
            value={activeManuscriptId || ''}
            onChange={handleSwitch}
          >
            {manuscriptGroups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        )}
        <button className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center" onClick={onClose}>&times;</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 scrollbar-light">
        {scripts.length > 0 && (
          <div>
            {scripts.map((s) => (
              <div key={s.id} className="mb-2 rounded-lg border border-slate-100">
                <div className="flex justify-between items-center px-3 py-2 cursor-pointer text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => toggle(s.id)}>
                  {s.title}
                  <span className="text-slate-400 text-xs">{collapsed[s.id] ? '\u25BC' : '\u25B2'}</span>
                </div>
                {!collapsed[s.id] && (
                  <div className="px-3 pb-3 text-sm text-slate-600 whitespace-pre-wrap">{s.content}</div>
                )}
              </div>
            ))}
          </div>
        )}
        {objections.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase text-slate-500 mb-2">Invändningar</div>
            {objections.map((s) => (
              <div key={s.id} className="mb-2 rounded-lg border border-slate-100">
                <div className="flex justify-between items-center px-3 py-2 cursor-pointer text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => toggle(s.id)}>
                  {s.title}
                  <span className="text-slate-400 text-xs">{collapsed[s.id] ? '\u25BC' : '\u25B2'}</span>
                </div>
                {!collapsed[s.id] && (
                  <div className="px-3 pb-3 text-sm text-slate-600 whitespace-pre-wrap">{s.content}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
