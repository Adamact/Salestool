import React, { useState } from 'react';
import clsx from 'clsx';
import { getStatusColor, getStatusLabel, STATUS_OPTIONS } from '../constants/statuses';
import ManuscriptSplitPanel from './ManuscriptSplitPanel';
import NotesPanel from './NotesPanel';
import CallHistory from './CallHistory';
import TimelinePanel from './TimelinePanel';
import ContactsPanel from './ContactsPanel';
import AddToListButton from './AddToListButton';

const TABS = [
  { key: 'contacts', label: 'Kontakter', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  )},
  { key: 'manuscript', label: 'Manus & Invändningar', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )},
  { key: 'timeline', label: 'Tidslinje', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  )},
];

const CUSTOM_FIELD_LABELS = {
  employees: 'Anställda',
  linkedin: 'LinkedIn',
  website: 'Hemsida',
  tier: 'Prioritet',
  whyGoodFit: 'Varför bra match',
};

function formatCustomFieldValue(key, value) {
  if (!value) return null;
  if (key === 'linkedin' || key === 'website') {
    if (value.startsWith('http')) {
      return (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
          {value.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
        </a>
      );
    }
  }
  return value;
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.preventDefault();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-1 inline-flex items-center justify-center h-5 w-5 rounded text-slate-400 hover:text-accent hover:bg-accent-subtle transition-colors"
      title="Kopiera"
    >
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-green-500">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
      )}
    </button>
  );
}

function CustomFieldsCollapsible({ customFields }) {
  const [open, setOpen] = useState(false);

  if (!customFields || Object.keys(customFields).length === 0) return null;

  return (
    <div className="mt-3">
      <button
        className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span>Mer info</span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={clsx('transition-transform duration-200', open && 'rotate-180')}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 animate-fade-in">
          {Object.entries(customFields).map(([key, value]) => {
            if (!value) return null;
            const label = CUSTOM_FIELD_LABELS[key] || key;
            const displayValue = formatCustomFieldValue(key, String(value));
            if (!displayValue) return null;
            return (
              <span key={key} className="text-sm text-slate-600">
                <span className="font-medium text-slate-500">{label}:</span>{' '}{displayValue}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FocusPanel({ lead, manuscript, activeTab, onTabChange, onLogCall, onStatusChange, onLeadRefresh, onManuscriptChange, onDeleteLead, manuscriptGroups, activeManuscriptId, onManuscriptGroupChange, onActiveManuscriptChange }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!lead) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-4 text-slate-300">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
          </svg>
          <p className="text-base text-slate-400">Välj en lead från listan för att börja</p>
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
    <div className="flex-1 flex flex-col bg-bg-primary overflow-hidden">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-border shadow-xs px-6 py-5">
        <div className="flex items-start justify-between gap-6">
          {/* Lead Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-xl font-extrabold text-text-primary truncate">
                {lead.company || 'Okänt företag'}
              </h1>
              <span
                className="flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white animate-fade-in"
                style={{ backgroundColor: getStatusColor(lead.status) }}
              >
                {getStatusLabel(lead.status)}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-text-secondary">
              {lead.city && (
                <span className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400 flex-shrink-0">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  {lead.city}
                </span>
              )}
              {lead.industry && (
                <span className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400 flex-shrink-0">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                  </svg>
                  {lead.industry}
                </span>
              )}
              {contacts.length > 0 && (
                <span className="text-slate-400">{contacts.length} kontakt{contacts.length > 1 ? 'er' : ''}</span>
              )}
            </div>

            {primaryContact && (
              <div className="mt-3 flex items-center flex-wrap gap-x-4 gap-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Primär:</span>
                <span className="text-sm font-medium text-text-primary">
                  {primaryContact.name || 'Namnlös'}
                </span>
                {primaryContact.title && (
                  <span className="text-sm text-text-secondary">{primaryContact.title}</span>
                )}
                {primaryContact.phone && (
                  <span className="inline-flex items-center">
                    <a href={`tel:${primaryContact.phone}`} className="text-sm font-medium text-accent hover:underline">
                      {primaryContact.phone}
                    </a>
                    <CopyButton text={primaryContact.phone} />
                  </span>
                )}
                {primaryContact.phone_mobile && (
                  <span className="inline-flex items-center">
                    <a href={`tel:${primaryContact.phone_mobile}`} className="text-sm font-medium text-accent hover:underline">
                      {primaryContact.phone_mobile}
                    </a>
                    <CopyButton text={primaryContact.phone_mobile} />
                  </span>
                )}
                {primaryContact.email && (
                  <span className="inline-flex items-center">
                    <a href={`mailto:${primaryContact.email}`} className="text-sm text-accent hover:underline">
                      {primaryContact.email}
                    </a>
                    <CopyButton text={primaryContact.email} />
                  </span>
                )}
              </div>
            )}

            <CustomFieldsCollapsible customFields={customFields} />
          </div>

          {/* Actions */}
          <div className="flex flex-shrink-0 items-center gap-2.5 flex-wrap justify-end">
            <button
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover transition-colors active:scale-[0.98]"
              onClick={onLogCall}
            >
              Logga samtal
            </button>
            <AddToListButton leadId={lead.id} />
            <select
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
              value={lead.status || 'new'}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {!confirmDelete ? (
              <button
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                onClick={() => setConfirmDelete(true)}
                title="Ta bort företag"
              >
                Ta bort
              </button>
            ) : (
              <div className="flex items-center gap-2 animate-fade-in">
                <span className="text-xs text-slate-500">Är du säker?</span>
                <button
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                  onClick={() => { setConfirmDelete(false); onDeleteLead(lead.id); }}
                >
                  Ja, ta bort
                </button>
                <button
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                  onClick={() => setConfirmDelete(false)}
                >
                  Avbryt
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="relative bg-white border-b border-border px-6">
        <div className="flex gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={clsx(
                'relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'text-accent'
                  : 'text-text-secondary hover:text-text-primary'
              )}
              onClick={() => onTabChange(tab.key)}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-light">
        <div className="animate-fade-in">
          {activeTab === 'contacts' && <ContactsPanel leadId={lead.id} contacts={contacts} onContactsChange={onLeadRefresh} />}
          {activeTab === 'manuscript' && (
            <ManuscriptSplitPanel
              manuscript={manuscript}
              onManuscriptChange={onManuscriptChange}
              manuscriptGroups={manuscriptGroups}
              activeManuscriptId={activeManuscriptId}
              onManuscriptGroupChange={onManuscriptGroupChange}
              onActiveManuscriptChange={onActiveManuscriptChange}
            />
          )}
          {activeTab === 'timeline' && <TimelinePanel leadId={lead.id} />}
        </div>
      </div>
    </div>
  );
}
