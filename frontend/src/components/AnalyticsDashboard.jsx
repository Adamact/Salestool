import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { getStatusColor, getStatusLabel } from '../constants/statuses';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export default function AnalyticsDashboard({ onClose }) {
  const api = useApi();
  const [data, setData] = useState(null);
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());

  const loadData = useCallback(() => {
    api.getAnalytics({ startDate, endDate })
      .then(setData)
      .catch(() => setData(null));
  }, [api, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const setPreset = (preset) => {
    const today = todayStr();
    switch (preset) {
      case 'today':
        setStartDate(today);
        setEndDate(today);
        break;
      case 'week':
        setStartDate(daysAgo(7));
        setEndDate(today);
        break;
      case 'month':
        setStartDate(daysAgo(30));
        setEndDate(today);
        break;
    }
  };

  const isRange = startDate !== endDate;
  const periodLabel = isRange
    ? `${startDate} \u2013 ${endDate}`
    : 'idag';

  if (!data) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
          <div className="modal__header">
            <h3>Analys</h3>
            <button className="modal__close" onClick={onClose}>&times;</button>
          </div>
          <div className="modal__body">
            <p>Laddar...</p>
          </div>
        </div>
      </div>
    );
  }

  const maxCalls = Math.max(1, ...data.calls_by_hour.map((h) => h.count));
  const maxOutcome = Math.max(1, ...data.outcome_distribution.map((o) => o.count));
  const maxDay = Math.max(1, ...data.calls_per_day.map((d) => d.count));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>Sessionsanalys</h3>
          <button className="modal__close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal__body analytics">
          {/* Date range picker */}
          <div className="analytics__section analytics__date-range">
            <div className="analytics__date-inputs">
              <label>
                Fr\u00e5n
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </label>
              <label>
                Till
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </label>
            </div>
            <div className="analytics__date-presets">
              <button onClick={() => setPreset('today')} className={!isRange ? 'active' : ''}>Idag</button>
              <button onClick={() => setPreset('week')} className={startDate === daysAgo(7) && endDate === todayStr() ? 'active' : ''}>7 dagar</button>
              <button onClick={() => setPreset('month')} className={startDate === daysAgo(30) && endDate === todayStr() ? 'active' : ''}>30 dagar</button>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="analytics__section">
            <h4>Konverteringstratt</h4>
            <div className="analytics__funnel">
              <div className="analytics__funnel-step">
                <span className="analytics__funnel-value">{data.funnel.total}</span>
                <span className="analytics__funnel-label">Totalt</span>
              </div>
              <span className="analytics__funnel-arrow">&rarr;</span>
              <div className="analytics__funnel-step">
                <span className="analytics__funnel-value">{data.funnel.interested}</span>
                <span className="analytics__funnel-label">Intresserade</span>
              </div>
              <span className="analytics__funnel-arrow">&rarr;</span>
              <div className="analytics__funnel-step">
                <span className="analytics__funnel-value">{data.funnel.booked_meeting}</span>
                <span className="analytics__funnel-label">Bokade m\u00f6ten</span>
              </div>
            </div>
          </div>

          {/* Calls by Hour */}
          {data.calls_by_hour.length > 0 && (
            <div className="analytics__section">
              <h4>Samtal per timme ({periodLabel})</h4>
              <div className="analytics__bar-chart">
                {data.calls_by_hour.map((h) => (
                  <div key={h.hour} className="analytics__bar-group">
                    <div className="analytics__bar-wrapper">
                      <div
                        className="analytics__bar"
                        style={{ height: `${(h.count / maxCalls) * 100}%` }}
                      />
                    </div>
                    <span className="analytics__bar-label">{h.hour}</span>
                    <span className="analytics__bar-value">{h.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outcome Distribution */}
          {data.outcome_distribution.length > 0 && (
            <div className="analytics__section">
              <h4>Resultatf\u00f6rdelning ({periodLabel})</h4>
              <div className="analytics__h-bars">
                {data.outcome_distribution.map((o) => (
                  <div key={o.outcome} className="analytics__h-bar-row">
                    <span className="analytics__h-bar-label">{getStatusLabel(o.outcome)}</span>
                    <div className="analytics__h-bar-track">
                      <div
                        className="analytics__h-bar"
                        style={{
                          width: `${(o.count / maxOutcome) * 100}%`,
                          backgroundColor: getStatusColor(o.outcome),
                        }}
                      />
                    </div>
                    <span className="analytics__h-bar-value">{o.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Average Duration */}
          {data.avg_duration.length > 0 && (
            <div className="analytics__section">
              <h4>Snitt samtalstid per resultat</h4>
              <div className="analytics__duration-list">
                {data.avg_duration.map((d) => (
                  <div key={d.outcome} className="analytics__duration-item">
                    <span className="analytics__duration-label">{getStatusLabel(d.outcome)}</span>
                    <span className="analytics__duration-value">
                      {Math.floor(d.avg_seconds / 60)}:{Math.round(d.avg_seconds % 60).toString().padStart(2, '0')}
                    </span>
                    <span className="analytics__duration-count">({d.count} samtal)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Calls per Day */}
          {data.calls_per_day.length > 0 && (
            <div className="analytics__section">
              <h4>Samtal per dag</h4>
              <div className="analytics__bar-chart">
                {data.calls_per_day.map((d) => (
                  <div key={d.day} className="analytics__bar-group">
                    <div className="analytics__bar-wrapper">
                      <div
                        className="analytics__bar analytics__bar--day"
                        style={{ height: `${(d.count / maxDay) * 100}%` }}
                      />
                    </div>
                    <span className="analytics__bar-label">{d.day.slice(5)}</span>
                    <span className="analytics__bar-value">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
