import React, { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { getStatusColor, CALL_OUTCOMES as OUTCOMES } from '../constants/statuses';

export default function LogCallModal({ lead, onSave, onClose }) {
  const [outcome, setOutcome] = useState('no_answer');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [callbackTime, setCallbackTime] = useState('');
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const notesRef = useRef(null);
  const outcomeRef = useRef(outcome);
  const notesValRef = useRef(notes);
  const savingRef = useRef(saving);
  const callbackTimeRef = useRef(callbackTime);

  useEffect(() => { outcomeRef.current = outcome; }, [outcome]);
  useEffect(() => { notesValRef.current = notes; }, [notes]);
  useEffect(() => { savingRef.current = saving; }, [saving]);
  useEffect(() => { callbackTimeRef.current = callbackTime; }, [callbackTime]);

  // Call duration timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Auto-focus notes after outcome selection
  useEffect(() => {
    if (outcome && notesRef.current) {
      notesRef.current.focus();
    }
  }, [outcome]);

  // Keyboard shortcuts: 1-9 for outcomes, Enter to save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'TEXTAREA') {
        // Only handle Ctrl+Enter in textarea to save
        if (e.key === 'Enter' && !e.shiftKey && e.ctrlKey) {
          e.preventDefault();
          if (!savingRef.current) handleSave();
        }
        return;
      }
      const num = parseInt(e.key);
      if (num >= 1 && num <= OUTCOMES.length) {
        e.preventDefault();
        setOutcome(OUTCOMES[num - 1].value);
      }
      if (e.key === 'Enter' && !savingRef.current) {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
    try {
      await onSave(outcome, notes, {
        callback_time: outcome === 'callback' ? callbackTime || null : null,
        duration_seconds: durationSeconds,
      });
    } finally {
      setSaving(false);
    }
  };

  if (!lead) return null;

  // Default callback time to tomorrow at 10:00
  const getDefaultCallbackTime = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-lg max-w-lg w-full mx-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Logga samtal</h3>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-mono tabular-nums">{formatTimer(elapsed)}</span>
            </span>
            <button
              className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              onClick={onClose}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{lead.company}</span>
            {' '}&mdash; {lead.contact_name}
          </p>

          {/* Outcome selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Resultat{' '}
              <span className="text-xs font-normal text-slate-400">(tryck 1-9)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {OUTCOMES.map((o, idx) => {
                const color = getStatusColor(o.value);
                const isSelected = outcome === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    className={clsx(
                      'relative flex items-center gap-2 rounded-lg border py-2.5 px-3 text-sm font-medium transition-all duration-150 cursor-pointer text-left',
                      isSelected
                        ? 'text-white border-transparent shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    )}
                    style={
                      isSelected
                        ? { backgroundColor: color, borderColor: color }
                        : { borderLeftWidth: '3px', borderLeftColor: color }
                    }
                    onClick={() => setOutcome(o.value)}
                  >
                    <span
                      className={clsx(
                        'inline-flex items-center justify-center h-5 w-5 rounded text-xs font-bold shrink-0',
                        isSelected
                          ? 'bg-white/25 text-white'
                          : 'bg-slate-100 text-slate-500'
                      )}
                    >
                      {idx + 1}
                    </span>
                    <span className="truncate">{o.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Callback time */}
          {outcome === 'callback' && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Återring tid
              </label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-shadow"
                value={callbackTime || getDefaultCallbackTime()}
                onChange={(e) => setCallbackTime(e.target.value)}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Anteckningar (valfritt){' '}
              <span className="text-xs font-normal text-slate-400">Ctrl+Enter för att spara</span>
            </label>
            <textarea
              ref={notesRef}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-shadow resize-y"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anteckningar om samtalet..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button
            className="rounded-lg bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            onClick={onClose}
          >
            Avbryt
          </button>
          <button
            className={clsx(
              'rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors',
              saving
                ? 'bg-accent/70 cursor-not-allowed'
                : 'bg-accent hover:bg-accent-hover'
            )}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Sparar...' : 'Spara'}
          </button>
        </div>
      </div>
    </div>
  );
}
