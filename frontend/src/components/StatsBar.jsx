import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function StatsBar({ onOpenCalendar, powerDialMode, onTogglePowerDial, onOpenAnalytics, onToggleScript, showFloatingScript }) {
  const api = useApi();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let mounted = true;

    function load() {
      api.getStats()
        .then((data) => { if (mounted) setStats(data); })
        .catch(() => {});
    }

    load();
    const interval = setInterval(load, 60000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [api]);

  if (!stats) {
    return (
      <div className="stats-bar">
        <span className="stats-loading">Laddar statistik...</span>
      </div>
    );
  }

  return (
    <div className="stats-bar">
      <div className="stat-item">
        <span className="stat-value">{stats.total ?? 0}</span>
        <span className="stat-label">Leads</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">{stats.new ?? 0}</span>
        <span className="stat-label">Ej ringda</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">{stats.no_answer ?? 0}</span>
        <span className="stat-label">Inget svar</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">{stats.callback ?? 0}</span>
        <span className="stat-label">{'\u00c5'}terring</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">{stats.interested ?? 0}</span>
        <span className="stat-label">Intresserade</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">{stats.booked_meeting ?? 0}</span>
        <span className="stat-label">Bokade m{'\u00f6'}ten</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">{stats.sent_email ?? 0}</span>
        <span className="stat-label">Skickat mejl</span>
      </div>

      <div className="stats-bar__divider" />

      <div className="stat-item stat-item--session">
        <span className="stat-value">{stats.calls_today ?? 0}</span>
        <span className="stat-label">Samtal idag</span>
      </div>
      <div className="stat-item stat-item--session">
        <span className="stat-value">{stats.calls_per_hour ?? 0}</span>
        <span className="stat-label">Samtal/h</span>
      </div>

      <div className="stats-bar__spacer" />

      <button
        className={`stats-bar__power-btn ${powerDialMode ? 'stats-bar__power-btn--active' : ''}`}
        onClick={onTogglePowerDial}
        title="Power dial - auto-öppna nästa samtal"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        Power
      </button>

      <button
        className={`stats-bar__calendar-btn ${showFloatingScript ? 'stats-bar__calendar-btn--active' : ''}`}
        onClick={onToggleScript}
        title="Visa/dölj manus"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        Manus
      </button>

      <button className="stats-bar__calendar-btn" onClick={onOpenAnalytics} title="Analys">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
        Analys
      </button>

      <button className="stats-bar__calendar-btn" onClick={onOpenCalendar} title="Kalender">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        Kalender
      </button>
    </div>
  );
}
