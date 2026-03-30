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

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function Delta({ current, previous }) {
  if (!previous) return null;
  const diff = current - previous;
  if (diff === 0) return null;
  const arrow = diff > 0 ? '\u25B2' : '\u25BC';
  const cls = diff > 0 ? 'analytics__delta--up' : 'analytics__delta--down';
  return <span className={`analytics__delta ${cls}`}>{arrow} {Math.abs(diff)}</span>;
}

function DeltaPct({ current, previous }) {
  if (!previous) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.1) return null;
  const arrow = diff > 0 ? '\u25B2' : '\u25BC';
  const cls = diff > 0 ? 'analytics__delta--up' : 'analytics__delta--down';
  return <span className={`analytics__delta ${cls}`}>{arrow} {Math.abs(diff).toFixed(0)}%</span>;
}

export default function AnalyticsDashboard({ onClose }) {
  const api = useApi();
  const [data, setData] = useState(null);
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [segmentView, setSegmentView] = useState('industry');

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

  const kpis = data.kpis || { total_calls: 0, active_days: 0, connected: 0, converted: 0, meetings: 0 };
  const prev = data.kpis_previous || null;
  const connectRate = pct(kpis.connected || 0, kpis.total_calls);
  const conversionRate = pct(kpis.converted || 0, kpis.total_calls);
  const callsPerMeeting = kpis.meetings > 0 ? Math.round(kpis.total_calls / kpis.meetings) : null;
  const avgCallsPerDay = kpis.active_days > 0 ? Math.round(kpis.total_calls / kpis.active_days) : 0;

  const prevConnectRate = prev ? pct(prev.connected || 0, prev.total_calls) : 0;
  const prevConversionRate = prev ? pct(prev.converted || 0, prev.total_calls) : 0;

  const callsByHour = data.calls_by_hour || [];
  const outcomeDistribution = data.outcome_distribution || [];
  const avgDuration = data.avg_duration || [];
  const callsPerDay = data.calls_per_day || [];
  const byIndustry = data.by_industry || [];
  const byCity = data.by_city || [];
  const callbackStats = data.callback_stats || { total: 0, converted: 0, rejected: 0, pending: 0 };
  const funnel = data.funnel || { total: 0, interested: 0, booked_meeting: 0 };
  const velocity = data.velocity || {};

  const maxCalls = callsByHour.length > 0 ? Math.max(1, ...callsByHour.map((h) => h.count)) : 1;
  const maxOutcome = outcomeDistribution.length > 0 ? Math.max(1, ...outcomeDistribution.map((o) => o.count)) : 1;
  const maxDay = callsPerDay.length > 0 ? Math.max(1, ...callsPerDay.map((d) => d.count)) : 1;

  // Find best hour by connect rate
  const bestHour = callsByHour.length > 0
    ? callsByHour.reduce((best, h) => {
        const rate = h.count >= 3 ? pct(h.connected, h.count) : 0;
        return rate > (best.rate || 0) ? { hour: h.hour, rate } : best;
      }, {})
    : null;

  const segmentData = (segmentView === 'industry' ? byIndustry : byCity);
  const maxSegmentRate = segmentData.length > 0 ? Math.max(1, ...segmentData.map((s) => s.rate)) : 1;

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
                Från
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

          {/* KPI Cards */}
          <div className="analytics__section">
            <div className="analytics__kpi-row">
              <div className="analytics__kpi-card">
                <span className="analytics__kpi-value">{kpis.total_calls}</span>
                <span className="analytics__kpi-label">Totalt samtal</span>
                <Delta current={kpis.total_calls} previous={prev?.total_calls} />
              </div>
              <div className="analytics__kpi-card">
                <span className="analytics__kpi-value">{connectRate}%</span>
                <span className="analytics__kpi-label">Kontaktfrekvens</span>
                <DeltaPct current={connectRate} previous={prevConnectRate} />
              </div>
              <div className="analytics__kpi-card">
                <span className="analytics__kpi-value">{conversionRate}%</span>
                <span className="analytics__kpi-label">Konvertering</span>
                <DeltaPct current={conversionRate} previous={prevConversionRate} />
              </div>
              <div className="analytics__kpi-card">
                <span className="analytics__kpi-value">{callsPerMeeting ?? '–'}</span>
                <span className="analytics__kpi-label">Samtal/möte</span>
              </div>
              <div className="analytics__kpi-card">
                <span className="analytics__kpi-value">{avgCallsPerDay}</span>
                <span className="analytics__kpi-label">Snitt/dag</span>
                <Delta current={avgCallsPerDay} previous={prev?.active_days > 0 ? Math.round(prev.total_calls / prev.active_days) : null} />
              </div>
            </div>
          </div>

          {/* Conversion Funnel (date-filtered) */}
          <div className="analytics__section">
            <h4>Konverteringstratt ({periodLabel})</h4>
            <div className="analytics__funnel">
              <div className="analytics__funnel-step">
                <span className="analytics__funnel-value">{funnel.total}</span>
                <span className="analytics__funnel-label">Leads ringda</span>
              </div>
              <div className="analytics__funnel-arrow-group">
                <span className="analytics__funnel-arrow">&rarr;</span>
                <span className="analytics__funnel-pct">{pct(funnel.interested, funnel.total)}%</span>
              </div>
              <div className="analytics__funnel-step">
                <span className="analytics__funnel-value">{funnel.interested}</span>
                <span className="analytics__funnel-label">Intresserade</span>
              </div>
              <div className="analytics__funnel-arrow-group">
                <span className="analytics__funnel-arrow">&rarr;</span>
                <span className="analytics__funnel-pct">{pct(funnel.booked_meeting, funnel.interested)}%</span>
              </div>
              <div className="analytics__funnel-step">
                <span className="analytics__funnel-value">{funnel.booked_meeting}</span>
                <span className="analytics__funnel-label">Bokade möten</span>
              </div>
            </div>
          </div>

          {/* Best Time to Call */}
          {callsByHour.length > 0 && (
            <div className="analytics__section">
              <h4>
                Samtal per timme ({periodLabel})
                {bestHour && bestHour.rate > 0 && (
                  <span className="analytics__best-hour">
                    Bästa timme: {bestHour.hour}:00 ({bestHour.rate}% kontakt)
                  </span>
                )}
              </h4>
              <div className="analytics__bar-chart">
                {callsByHour.map((h) => {
                  const connectPct = pct(h.connected, h.count);
                  return (
                    <div key={h.hour} className="analytics__bar-group">
                      <div className="analytics__bar-wrapper">
                        <div
                          className="analytics__bar analytics__bar--outer"
                          style={{ height: `${(h.count / maxCalls) * 100}%` }}
                        >
                          <div
                            className="analytics__bar--inner"
                            style={{ height: `${connectPct}%` }}
                            title={`${connectPct}% kontakt`}
                          />
                        </div>
                      </div>
                      <span className="analytics__bar-label">{h.hour}</span>
                      <span className="analytics__bar-value">{h.count}</span>
                    </div>
                  );
                })}
              </div>
              <div className="analytics__bar-legend">
                <span className="analytics__legend-item"><span className="analytics__legend-swatch analytics__legend-swatch--total" /> Totalt</span>
                <span className="analytics__legend-item"><span className="analytics__legend-swatch analytics__legend-swatch--connected" /> Kontakt</span>
              </div>
            </div>
          )}

          {/* Outcome Distribution */}
          {outcomeDistribution.length > 0 && (
            <div className="analytics__section">
              <h4>Resultatfördelning ({periodLabel})</h4>
              <div className="analytics__h-bars">
                {outcomeDistribution.map((o) => (
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
          {avgDuration.length > 0 && (
            <div className="analytics__section">
              <h4>Snitt samtalstid per resultat</h4>
              <div className="analytics__duration-list">
                {avgDuration.map((d) => (
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
          {callsPerDay.length > 0 && (
            <div className="analytics__section">
              <h4>Samtal per dag</h4>
              <div className="analytics__bar-chart">
                {callsPerDay.map((d) => (
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

          {/* Callback Effectiveness */}
          {callbackStats.total > 0 && (
            <div className="analytics__section">
              <h4>Återringningar ({periodLabel})</h4>
              <div className="analytics__callback-stats">
                <div className="analytics__callback-summary">
                  <span>{callbackStats.total} totalt</span>
                  <span className="analytics__callback-converted">{callbackStats.converted} konverterade ({pct(callbackStats.converted, callbackStats.total)}%)</span>
                  <span className="analytics__callback-rejected">{callbackStats.rejected} ej intresserade</span>
                  <span>{callbackStats.pending} väntar</span>
                </div>
                <div className="analytics__segmented-bar">
                  {callbackStats.converted > 0 && (
                    <div
                      className="analytics__seg analytics__seg--converted"
                      style={{ flex: callbackStats.converted }}
                    />
                  )}
                  {callbackStats.rejected > 0 && (
                    <div
                      className="analytics__seg analytics__seg--rejected"
                      style={{ flex: callbackStats.rejected }}
                    />
                  )}
                  {callbackStats.pending > 0 && (
                    <div
                      className="analytics__seg analytics__seg--pending"
                      style={{ flex: callbackStats.pending }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Industry/City Breakdown */}
          {(byIndustry.length > 0 || byCity.length > 0) && (
            <div className="analytics__section">
              <h4>
                Konvertering per segment
                <div className="analytics__segment-toggle">
                  <button
                    className={segmentView === 'industry' ? 'active' : ''}
                    onClick={() => setSegmentView('industry')}
                  >Bransch</button>
                  <button
                    className={segmentView === 'city' ? 'active' : ''}
                    onClick={() => setSegmentView('city')}
                  >Stad</button>
                </div>
              </h4>
              {segmentData.length > 0 ? (
                <div className="analytics__h-bars">
                  {segmentData.map((s) => (
                    <div key={s.industry || s.city} className="analytics__h-bar-row">
                      <span className="analytics__h-bar-label">{s.industry || s.city}</span>
                      <div className="analytics__h-bar-track">
                        <div
                          className="analytics__h-bar"
                          style={{
                            width: `${(s.rate / maxSegmentRate) * 100}%`,
                            backgroundColor: 'var(--accent)',
                          }}
                        />
                      </div>
                      <span className="analytics__h-bar-value">{s.rate}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="analytics__empty">Inte tillräckligt med data (minst 3 samtal per segment)</p>
              )}
            </div>
          )}

          {/* Pipeline Velocity */}
          {(velocity.days_to_first_call !== null || velocity.days_to_meeting !== null) && (
            <div className="analytics__section">
              <h4>Pipeline-hastighet</h4>
              <div className="analytics__velocity">
                {velocity.days_to_first_call !== null && (
                  <div className="analytics__velocity-item">
                    <span className="analytics__velocity-value">{velocity.days_to_first_call}</span>
                    <span className="analytics__velocity-label">dagar till första samtal</span>
                  </div>
                )}
                {velocity.days_to_meeting !== null && (
                  <div className="analytics__velocity-item">
                    <span className="analytics__velocity-value">{velocity.days_to_meeting}</span>
                    <span className="analytics__velocity-label">dagar till bokat möte</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
