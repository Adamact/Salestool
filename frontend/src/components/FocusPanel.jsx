import React, { useState } from 'react';
import { getStatusColor, getStatusLabel, STATUS_OPTIONS } from '../constants/statuses';
import ManuscriptSplitPanel from './ManuscriptSplitPanel';
import NotesPanel from './NotesPanel';
import CallHistory from './CallHistory';
import TimelinePanel from './TimelinePanel';
import ContactsPanel from './ContactsPanel';
import AddToListButton from './AddToListButton';

const TABS = [
  { key: 'contacts', label: 'Kontakter' },
  { key: 'manuscript', label: 'Manus & Inv\u00e4ndningar' },
  { key: 'timeline', label: 'Tidslinje' },
];

const CUSTOM_FIELD_LABELS = {
  employees: 'Anst\u00e4llda',
  linkedin: 'LinkedIn',
  website: 'Hemsida',
  tier: 'Prioritet',
  whyGoodFit: 'Varf\u00f6r bra match',
};

function formatCustomFieldValue(key, value) {
  if (!value) return null;
  if (key === 'linkedin' || key === 'website') {
    if (value.startsWith('http')) {
      return <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>{value.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a>;
    }
  }
  return value;
}

function CustomFieldsCollapsible({ customFields }) {
  const [open, setOpen] = useState(false);

  if (!customFields || Object.keys(customFields).length === 0) return null;

  return (
    <div className={`focus-panel__custom-fields ${open ? 'focus-panel__custom-fields--open' : ''}`}>
      <button className="focus-panel__custom-toggle" onClick={() => setOpen((o) => !o)}>
        <span>Mer info</span>
        <span className="focus-panel__custom-chevron">{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && (
        <div className="focus-panel__custom-body">
          {Object.entries(customFields).map(([key, value]) => {
            if (!value) return null;
            const label = CUSTOM_FIELD_LABELS[key] || key;
            const displayValue = formatCustomFieldValue(key, String(value));
            if (!displayValue) return null;
            return (
              <span key={key} className="focus-panel__detail">
                <strong>{label}:</strong> {displayValue}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FocusPanel({ lead, manuscript, activeTab, onTabChange, onLogCall, onStatusChange, onLeadRefresh, onManuscriptChange, onDeleteLead }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!lead) {
    return (
      <div className="focus-panel focus-panel--empty">
        <div className="focus-panel__placeholder">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.2 }}>
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
          </svg>
          <p>V{'\u00e4'}lj en lead fr{'\u00e5'}n listan f{'\u00f6'}r att b{'\u00f6'}rja</p>
        </div>
      </div>
    );
  }

  let customFields = null;
  try {
    customFields = lead.custom_fields ? (typeof lead.custom_fields === 'string' ? JSON.parse(lead.custom_fields) : lead.custom_fields) : null;
  } catch {
    customFields = null;
  }

  const contacts = lead.contacts || [];
  const primaryContact = contacts.find((c) => c.is_primary) || contacts[0];

  return (
    <div className="focus-panel">
      <div className="focus-panel__header">
        <div className="focus-panel__lead-info">
          <h1 className="focus-panel__company">{lead.company || 'Ok\u00e4nt f\u00f6retag'}</h1>
          <div className="focus-panel__details">
            {lead.city && <span className="focus-panel__detail"><strong>Stad:</strong> {lead.city}</span>}
            {lead.industry && <span className="focus-panel__detail"><strong>Bransch:</strong> {lead.industry}</span>}
            {contacts.length > 0 && (
              <span className="focus-panel__detail"><strong>Kontakter:</strong> {contacts.length} st</span>
            )}
          </div>

          {primaryContact && (
            <div className="focus-panel__primary-contact">
              <span className="focus-panel__primary-label">Primär kontakt:</span>
              <span className="focus-panel__primary-name">{primaryContact.name || 'Namnlös'}</span>
              {primaryContact.title && <span className="focus-panel__detail"> - {primaryContact.title}</span>}
              <div className="focus-panel__primary-phones">
                {primaryContact.phone && (
                  <a href={`tel:${primaryContact.phone}`} className="focus-panel__phone">{primaryContact.phone}</a>
                )}
                {primaryContact.phone_mobile && (
                  <a href={`tel:${primaryContact.phone_mobile}`} className="focus-panel__phone">{primaryContact.phone_mobile}</a>
                )}
                {primaryContact.email && (
                  <a href={`mailto:${primaryContact.email}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{primaryContact.email}</a>
                )}
              </div>
            </div>
          )}

          <CustomFieldsCollapsible customFields={customFields} />
        </div>

        <div className="focus-panel__actions">
          <button className="btn btn--primary" onClick={onLogCall}>
            Logga samtal
          </button>
          <AddToListButton leadId={lead.id} />
          <select
            className="focus-panel__status-select"
            value={lead.status || 'new'}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span className="focus-panel__badge" style={{ backgroundColor: getStatusColor(lead.status) }}>
            {getStatusLabel(lead.status)}
          </span>
          {!confirmDelete ? (
            <button
              className="btn btn--danger-outline"
              onClick={() => setConfirmDelete(true)}
              title="Ta bort f\u00f6retag"
            >
              Ta bort
            </button>
          ) : (
            <div className="focus-panel__confirm-delete">
              <span className="focus-panel__confirm-text">{'\u00c4'}r du s{'\u00e4'}ker?</span>
              <button
                className="btn btn--danger"
                onClick={() => { setConfirmDelete(false); onDeleteLead(lead.id); }}
              >
                Ja, ta bort
              </button>
              <button
                className="btn btn--secondary"
                onClick={() => setConfirmDelete(false)}
              >
                Avbryt
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="focus-panel__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`focus-panel__tab ${activeTab === tab.key ? 'focus-panel__tab--active' : ''}`}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="focus-panel__content">
        {activeTab === 'contacts' && <ContactsPanel leadId={lead.id} contacts={contacts} onContactsChange={onLeadRefresh} />}
        {activeTab === 'manuscript' && <ManuscriptSplitPanel manuscript={manuscript} onManuscriptChange={onManuscriptChange} />}
        {activeTab === 'timeline' && <TimelinePanel leadId={lead.id} />}
      </div>
    </div>
  );
}
