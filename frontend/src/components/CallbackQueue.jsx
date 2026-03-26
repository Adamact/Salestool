import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function CallbackQueue({ onSelectLead }) {
  const api = useApi();
  const [callbacks, setCallbacks] = useState([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let mounted = true;

    function load() {
      api.getCallbacks()
        .then((data) => { if (mounted) setCallbacks(Array.isArray(data) ? data : []); })
        .catch(() => { if (mounted) setCallbacks([]); });
    }

    load();
    const interval = setInterval(load, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [api]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Check for overdue callbacks and notify
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (callbacks.length === 0) return;

    const now = new Date();
    const overdue = callbacks.filter((cb) => {
      if (!cb.callback_time) return false;
      return new Date(cb.callback_time + 'Z') <= now;
    });

    if (overdue.length > 0) {
      const first = overdue[0];
      new Notification('Återring förfallen', {
        body: `${first.company} - ${first.contact_name || 'Okänd kontakt'}`,
        tag: `callback-${first.id}`,
      });
    }
  }, [callbacks]);

  if (callbacks.length === 0) return null;

  const now = new Date();

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'Z');
      const today = new Date();
      const isToday = d.toDateString() === today.toDateString();
      if (isToday) {
        return d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleString('sv-SE', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="callback-queue">
      <button className="callback-queue__header" onClick={() => setCollapsed((c) => !c)}>
        <span className="callback-queue__title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          Återring ({callbacks.length})
        </span>
        <span className="callback-queue__chevron">{collapsed ? '\u25BC' : '\u25B2'}</span>
      </button>
      {!collapsed && (
        <div className="callback-queue__list">
          {callbacks.map((cb) => {
            const isOverdue = cb.callback_time && new Date(cb.callback_time + 'Z') <= now;
            return (
              <button
                key={cb.id}
                className={`callback-queue__item ${isOverdue ? 'callback-queue__item--overdue' : ''}`}
                onClick={() => onSelectLead(cb.id)}
              >
                <span className="callback-queue__company">{cb.company || 'Okänt'}</span>
                <span className="callback-queue__time">
                  {cb.callback_time ? formatTime(cb.callback_time) : 'Ingen tid'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
