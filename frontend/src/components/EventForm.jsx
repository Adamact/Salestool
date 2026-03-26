import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';

const TYPE_COLORS = {
  calling_block: '#3b82f6',
  meeting: '#a855f7',
  followup: '#f97316',
  callback: '#eab308',
  other: '#6b7280',
};

const TYPE_DURATIONS = {
  calling_block: 120,
  meeting: 60,
  followup: 30,
  callback: 15,
  other: 60,
};

const EVENT_TYPES = [
  { value: 'calling_block', label: 'Ringblock' },
  { value: 'meeting', label: 'Möte' },
  { value: 'followup', label: 'Uppföljning' },
  { value: 'callback', label: 'Återring' },
  { value: 'other', label: 'Övrigt' },
];

function toDateString(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toTimeString(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function addMinutes(dateStr, timeStr, minutes) {
  const d = new Date(`${dateStr}T${timeStr}:00`);
  d.setMinutes(d.getMinutes() + minutes);
  return { date: toDateString(d), time: toTimeString(d) };
}

export default function EventForm({ event, defaultDate, defaultHour, leadId, onSave, onDelete, onClose }) {
  const api = useApi();

  const isEditing = !!event;

  // Initialize form state
  const getInitialState = () => {
    if (event) {
      const start = new Date(event.start_time || event.start);
      const end = new Date(event.end_time || event.end);
      return {
        title: event.title || '',
        event_type: event.event_type || 'other',
        startDate: toDateString(start),
        startTime: toTimeString(start),
        endDate: toDateString(end),
        endTime: toTimeString(end),
        lead_id: event.lead_id || null,
        leadDisplay: event.lead_company
          ? `${event.lead_company}${event.lead_contact ? ' - ' + event.lead_contact : ''}`
          : '',
        description: event.description || '',
        color: event.color || TYPE_COLORS[event.event_type] || TYPE_COLORS.other,
      };
    }

    const now = defaultDate || new Date();
    const hour = defaultHour != null ? defaultHour : now.getHours();
    const startDate = toDateString(now);
    const startTime = `${String(hour).padStart(2, '0')}:00`;
    const eventType = 'calling_block';
    const duration = TYPE_DURATIONS[eventType];
    const endResult = addMinutes(startDate, startTime, duration);

    return {
      title: '',
      event_type: eventType,
      startDate,
      startTime,
      endDate: endResult.date,
      endTime: endResult.time,
      lead_id: leadId || null,
      leadDisplay: '',
      description: '',
      color: TYPE_COLORS[eventType],
    };
  };

  const [form, setForm] = useState(getInitialState);
  const [leads, setLeads] = useState([]);
  const [leadSearch, setLeadSearch] = useState('');
  const [showLeadResults, setShowLeadResults] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Fetch leads for search
  useEffect(() => {
    let cancelled = false;
    api.getLeads().then((data) => {
      if (!cancelled) {
        setLeads(Array.isArray(data) ? data : data?.leads || []);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [api]);

  // If leadId is provided and leads are loaded, set the display
  useEffect(() => {
    if (leadId && leads.length > 0 && !form.leadDisplay) {
      const lead = leads.find((l) => l.id === leadId);
      if (lead) {
        setForm((prev) => ({
          ...prev,
          lead_id: lead.id,
          leadDisplay: `${lead.company}${lead.contact_name ? ' - ' + lead.contact_name : ''}`,
        }));
      }
    }
  }, [leadId, leads, form.leadDisplay]);

  const updateField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleTypeChange = (newType) => {
    const duration = TYPE_DURATIONS[newType] || 60;
    const endResult = addMinutes(form.startDate, form.startTime, duration);
    setForm((prev) => ({
      ...prev,
      event_type: newType,
      endDate: endResult.date,
      endTime: endResult.time,
      color: TYPE_COLORS[newType] || TYPE_COLORS.other,
    }));
  };

  const handleStartChange = (field, value) => {
    const newForm = { ...form, [field]: value };
    const startDate = field === 'startDate' ? value : form.startDate;
    const startTime = field === 'startTime' ? value : form.startTime;
    const duration = TYPE_DURATIONS[form.event_type] || 60;
    const endResult = addMinutes(startDate, startTime, duration);
    newForm.endDate = endResult.date;
    newForm.endTime = endResult.time;
    setForm(newForm);
  };

  const filteredLeads = leadSearch.trim()
    ? leads
        .filter((l) => {
          const term = leadSearch.toLowerCase();
          return (
            (l.company && l.company.toLowerCase().includes(term)) ||
            (l.contact_name && l.contact_name.toLowerCase().includes(term))
          );
        })
        .slice(0, 8)
    : [];

  const handleSelectLead = (lead) => {
    setForm((prev) => ({
      ...prev,
      lead_id: lead.id,
      leadDisplay: `${lead.company}${lead.contact_name ? ' - ' + lead.contact_name : ''}`,
    }));
    setLeadSearch('');
    setShowLeadResults(false);
  };

  const handleClearLead = () => {
    setForm((prev) => ({ ...prev, lead_id: null, leadDisplay: '' }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const data = {
        title: form.title.trim(),
        event_type: form.event_type,
        start_time: `${form.startDate}T${form.startTime}:00`,
        end_time: `${form.endDate}T${form.endTime}:00`,
        lead_id: form.lead_id || null,
        description: form.description,
        color: form.color,
      };
      await onSave(data);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (onDelete && event) {
      await onDelete(event.id);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal event-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>{isEditing ? 'Redigera händelse' : 'Ny händelse'}</h3>
          <button className="modal__close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal__body">
          <div className="event-form__grid">
            {/* Title */}
            <div className="event-form__field event-form__field--full">
              <label>Titel *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="T.ex. Ringblock Stockholm..."
                autoFocus
              />
            </div>

            {/* Event type */}
            <div className="event-form__field">
              <label>Typ</label>
              <div className="event-form__type-colors">
                <span
                  className="event-form__type-dot"
                  style={{ backgroundColor: form.color }}
                />
                <select
                  value={form.event_type}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  style={{ flex: 1 }}
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Spacer for grid alignment */}
            <div className="event-form__field" />

            {/* Start date & time */}
            <div className="event-form__field">
              <label>Startdatum</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => handleStartChange('startDate', e.target.value)}
              />
            </div>
            <div className="event-form__field">
              <label>Starttid</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => handleStartChange('startTime', e.target.value)}
              />
            </div>

            {/* End date & time */}
            <div className="event-form__field">
              <label>Slutdatum</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => updateField('endDate', e.target.value)}
              />
            </div>
            <div className="event-form__field">
              <label>Sluttid</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => updateField('endTime', e.target.value)}
              />
            </div>

            {/* Lead search */}
            <div className="event-form__field event-form__field--full">
              <label>Kopplat lead (valfritt)</label>
              {form.lead_id && form.leadDisplay ? (
                <div className="event-form__lead-selected">
                  <span>{form.leadDisplay}</span>
                  <button className="event-form__lead-clear" onClick={handleClearLead}>&times;</button>
                </div>
              ) : (
                <div className="event-form__lead-search">
                  <input
                    type="text"
                    value={leadSearch}
                    onChange={(e) => {
                      setLeadSearch(e.target.value);
                      setShowLeadResults(true);
                    }}
                    onFocus={() => setShowLeadResults(true)}
                    onBlur={() => setTimeout(() => setShowLeadResults(false), 200)}
                    placeholder="Sök företag..."
                  />
                  {showLeadResults && filteredLeads.length > 0 && (
                    <div className="event-form__lead-results">
                      {filteredLeads.map((lead) => (
                        <div
                          key={lead.id}
                          className="event-form__lead-item"
                          onMouseDown={() => handleSelectLead(lead)}
                        >
                          <strong>{lead.company}</strong>
                          {lead.contact_name && ` - ${lead.contact_name}`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="event-form__field event-form__field--full">
              <label>Beskrivning</label>
              <textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={3}
                placeholder="Valfri beskrivning..."
              />
            </div>
          </div>
        </div>

        <div className="modal__footer">
          {isEditing && onDelete && (
            <button
              className="event-form__delete"
              onClick={handleDelete}
              style={{ marginRight: 'auto' }}
            >
              {confirmDelete ? 'Bekräfta radering' : 'Radera'}
            </button>
          )}
          <button className="btn btn--secondary" onClick={onClose}>Avbryt</button>
          <button className="btn btn--primary" onClick={handleSave} disabled={saving || !form.title.trim()}>
            {saving ? 'Sparar...' : 'Spara'}
          </button>
        </div>
      </div>
    </div>
  );
}
