import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { getStatusColor, getStatusLabel } from '../constants/statuses';
import { formatDate } from '../utils/formatters';

export default function CallHistory({ leadId }) {
  const api = useApi();
  const [calls, setCalls] = useState([]);

  useEffect(() => {
    if (!leadId) return;
    api.getCallHistory(leadId)
      .then((data) => setCalls(Array.isArray(data) ? data : []))
      .catch(() => setCalls([]));
  }, [api, leadId]);

  if (calls.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-center py-8 text-sm text-slate-400">Ingen samtalshistorik ännu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {calls.map((call, i) => (
        <div key={call.id || i} className="rounded-lg border border-slate-100 p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
              style={{ backgroundColor: getStatusColor(call.outcome) }}
            >
              {getStatusLabel(call.outcome)}
            </span>
            {call.duration_seconds > 0 && (
              <span className="text-xs text-slate-500 font-mono">
                {Math.floor(call.duration_seconds / 60)}:{(call.duration_seconds % 60).toString().padStart(2, '0')}
              </span>
            )}
            <span className="text-xs text-slate-400 ml-auto">{formatDate(call.called_at)}</span>
          </div>
          {call.notes && <p className="text-sm text-slate-600 mt-1">{call.notes}</p>}
        </div>
      ))}
    </div>
  );
}
