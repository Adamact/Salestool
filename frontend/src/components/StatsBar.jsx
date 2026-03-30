import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { useApi } from '../hooks/useApi';

function StatItem({ value, label, first }) {
  return (
    <div className={`flex items-center flex-shrink-0 ${first ? '' : 'border-l border-white/8'}`}>
      <div className="flex flex-col items-center gap-2.5 min-w-[100px] py-1 mx-6">
        <span className="text-3xl font-bold tabular-nums text-sidebar-text-bright leading-none">
          {value}
        </span>
        <span className="text-[11px] uppercase tracking-wider text-slate-400 whitespace-nowrap">
          {label}
        </span>
      </div>
    </div>
  );
}

function SkeletonItem() {
  return (
    <div className="flex flex-col items-center gap-1.5 px-5">
      <div className="h-8 w-12 rounded bg-white/10 animate-pulse" />
      <div className="h-3.5 w-16 rounded bg-white/5 animate-pulse" />
    </div>
  );
}

function Divider() {
  return <div className="mx-5 h-12 w-px bg-white/10 self-center" />;
}

export default function StatsBar({ onOpenCalendar, powerDialMode, onTogglePowerDial, onOpenAnalytics, onToggleScript, showFloatingScript, onOpenSettings }) {
  const api = useApi();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let mounted = true;

    function load() {
      api.getStats()
        .then((data) => { if (mounted) setStats(data); })
        .catch((err) => { console.error('Failed to load stats:', err); });
    }

    load();
    const interval = setInterval(load, 60000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [api]);

  const actionBtnBase =
    'flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-sidebar-text transition-all duration-150 hover:bg-white/20 hover:text-sidebar-text-bright cursor-pointer';

  if (!stats) {
    return (
      <div className="flex items-center bg-sidebar-bg px-6 py-5 border-b border-white/10 min-h-[84px]">
        {/* Pipeline skeleton */}
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonItem key={i} />
        ))}
        <Divider />
        {/* Session skeleton */}
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonItem key={`s-${i}`} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center bg-sidebar-bg px-6 py-5 border-b border-white/10 min-h-[84px]">
      {/* Scrollable stats area */}
      <div className="flex items-center overflow-x-auto flex-1 min-w-0 scrollbar-thin">
        {/* Pipeline group */}
        <div className="flex items-center flex-shrink-0">
          <StatItem first value={stats.total ?? 0} label="Leads" />
          <StatItem value={stats.new ?? 0} label="Ej ringda" />
          <StatItem value={stats.no_answer ?? 0} label="Inget svar" />
          <StatItem value={stats.callback ?? 0} label={'Återring'} />
          <StatItem value={stats.interested ?? 0} label="Intresserade" />
          <StatItem value={stats.booked_meeting ?? 0} label={'Bokade möten'} />
          <StatItem value={stats.sent_email ?? 0} label="Skickat mejl" />
        </div>

        <Divider />

        {/* Session group */}
        <div className="flex items-center flex-shrink-0">
          <StatItem first value={stats.calls_today ?? 0} label="Samtal idag" />
          <StatItem value={stats.calls_per_hour ?? 0} label="Samtal/h" />
        </div>
      </div>

      <Divider />

      {/* Action buttons */}
      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
        {/* Power dial */}
        <button
          className={clsx(
            'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-150 cursor-pointer',
            powerDialMode
              ? 'bg-accent border-accent text-white shadow-[0_0_12px_rgba(99,102,241,0.5)]'
              : 'bg-white/10 border-white/15 text-sidebar-text hover:bg-white/20 hover:text-sidebar-text-bright'
          )}
          onClick={onTogglePowerDial}
          title="Power dial - auto-öppna nästa samtal"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          Power
        </button>

        {/* Manus */}
        <button
          className={clsx(
            actionBtnBase,
            showFloatingScript && 'bg-white/20 text-sidebar-text-bright'
          )}
          onClick={onToggleScript}
          title="Visa/dölj manus"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          Manus
        </button>

        {/* Analys */}
        <button
          className={actionBtnBase}
          onClick={onOpenAnalytics}
          title="Analys"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          Analys
        </button>

        {/* Kalender */}
        <button
          className={actionBtnBase}
          onClick={onOpenCalendar}
          title="Kalender"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Kalender
        </button>

        {/* Installningar */}
        <button
          className={actionBtnBase}
          onClick={onOpenSettings}
          title="Installningar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
