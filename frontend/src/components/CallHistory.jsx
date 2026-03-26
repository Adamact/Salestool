import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { getStatusColor, getStatusLabel } from '../constants/statuses';

export default function CallHistory({ leadId }) {
  const api = useApi();
  const [calls, setCalls] = useState([]);

  useEffect(() => {
    if (!leadId) return;
    api.getCallHistory(leadId)
      .then((data) => setCalls(Array.isArray(data) ? data : []))
      .catch(() => setCalls([]));
  }, [api, leadId]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'Z');
      return d.toLocaleString('sv-SE', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (calls.length === 0) {
    return (
      <div className="call-history">
        <p className="call-history__empty">Ingen samtalshistorik \u00e4nnu.</p>
      </div>
    );
  }

  return (
    <div className="call-history">
      {calls.map((call, i) => (
        <div key={call.id || i} className="call-item">
          <div className="call-item__top">
            <span
              className="call-item__badge"
              style={{ backgroundColor: getStatusColor(call.outcome) }}
            >
              {getStatusLabel(call.outcome)}
            </span>
            {call.duration_seconds > 0 && (
              <span className="call-item__duration">
                {Math.floor(call.duration_seconds / 60)}:{(call.duration_seconds % 60).toString().padStart(2, '0')}
              </span>
            )}
            <span className="call-item__date">{formatDate(call.called_at)}</span>
          </div>
          {call.notes && <p className="call-item__notes">{call.notes}</p>}
        </div>
      ))}
    </div>
  );
}
