import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';

const EMPTY_FORM = {
  name: '',
  title: '',
  phone: '',
  phone_mobile: '',
  email: '',
  department: '',
  linkedin: '',
};

export default function ContactsPanel({ leadId, contacts: initialContacts, onContactsChange }) {
  const api = useApi();
  const [contacts, setContacts] = useState(initialContacts || []);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    setContacts(initialContacts || []);
  }, [initialContacts]);

  const reload = useCallback(async () => {
    const data = await api.getContacts(leadId);
    setContacts(Array.isArray(data) ? data : []);
    if (onContactsChange) onContactsChange();
  }, [api, leadId, onContactsChange]);

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const handleEdit = (contact) => {
    setEditingId(contact.id);
    setForm({
      name: contact.name || '',
      title: contact.title || '',
      phone: contact.phone || '',
      phone_mobile: contact.phone_mobile || '',
      email: contact.email || '',
      department: contact.department || '',
      linkedin: contact.linkedin || '',
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    setSaveError(null);
    try {
      if (editingId) {
        await api.updateContact(leadId, editingId, form);
      } else {
        await api.addContact(leadId, form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await reload();
    } catch (err) {
      console.error('Failed to save contact:', err);
      setSaveError('Kunde inte spara kontakten. Försök igen.');
    }
  };

  const handleDelete = async (contactId) => {
    try {
      await api.deleteContact(leadId, contactId);
      await reload();
    } catch (err) {
      console.error('Failed to delete contact:', err);
    }
  };

  const handleSetPrimary = async (contactId) => {
    try {
      await api.updateContact(leadId, contactId, { is_primary: 1 });
      await reload();
    } catch (err) {
      console.error('Failed to set primary:', err);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-semibold text-slate-900">Kontaktpersoner ({contacts.length})</h3>
        <button className="bg-accent text-white rounded-lg px-3 py-1.5 text-sm" onClick={handleAdd}>
          + Lägg till
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 space-y-3">
          <h4 className="text-sm font-medium text-slate-700 mb-2">
            {editingId ? 'Redigera kontakt' : 'Ny kontakt'}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Namn</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Förnamn Efternamn"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Titel / Roll</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="t.ex. VD, Inköpschef"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Telefon (direkt)</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="08-123 456"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Mobil</label>
              <input
                type="tel"
                value={form.phone_mobile}
                onChange={(e) => handleChange('phone_mobile', e.target.value)}
                placeholder="070-123 45 67"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">E-post</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="namn@foretag.se"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Avdelning</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => handleChange('department', e.target.value)}
                placeholder="t.ex. Försäljning, IT"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">LinkedIn</label>
              <input
                type="url"
                value={form.linkedin}
                onChange={(e) => handleChange('linkedin', e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>
          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{saveError}</p>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <button className="bg-slate-100 text-slate-600 rounded-lg px-4 py-2 text-sm" onClick={handleCancel}>Avbryt</button>
            <button className="bg-accent text-white rounded-lg px-4 py-2 text-sm" onClick={handleSave}>
              {editingId ? 'Spara' : 'Lägg till'}
            </button>
          </div>
        </div>
      )}

      {contacts.length === 0 && !showForm && (
        <p className="text-center py-8 text-sm text-slate-400">Inga kontaktpersoner tillagda</p>
      )}

      <div>
        {contacts.map((c) => (
          <div
            key={c.id}
            className={`rounded-lg border p-4 mb-2 hover:shadow-xs transition-shadow ${
              c.is_primary ? 'border-accent/30 bg-accent-subtle' : 'border-slate-100'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">{c.name || 'Namnlös'}</span>
                {c.is_primary ? (
                  <span className="text-[10px] font-semibold bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">Primär</span>
                ) : null}
              </div>
              <div className="flex items-center gap-1">
                {!c.is_primary && (
                  <button
                    className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:text-amber-500"
                    onClick={() => handleSetPrimary(c.id)}
                    title="Gör till primär kontakt"
                  >
                    ★
                  </button>
                )}
                <button
                  className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:text-accent"
                  onClick={() => handleEdit(c)}
                  title="Redigera"
                >
                  ✎
                </button>
                <button
                  className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:text-red-500"
                  onClick={() => handleDelete(c.id)}
                  title="Ta bort"
                >
                  ✕
                </button>
              </div>
            </div>
            {c.title && <div className="text-sm text-slate-500">{c.title}</div>}
            {c.department && <div className="text-sm text-slate-500"><strong>Avdelning:</strong> {c.department}</div>}
            <div className="flex gap-3">
              {c.phone && (
                <span className="text-sm text-slate-500">
                  <strong>Tel:</strong>{' '}
                  <a href={`tel:${c.phone}`} className="text-accent hover:underline text-sm">{c.phone}</a>
                </span>
              )}
              {c.phone_mobile && (
                <span className="text-sm text-slate-500">
                  <strong>Mobil:</strong>{' '}
                  <a href={`tel:${c.phone_mobile}`} className="text-accent hover:underline text-sm">{c.phone_mobile}</a>
                </span>
              )}
            </div>
            {c.email && (
              <div className="text-sm text-slate-500">
                <strong>E-post:</strong>{' '}
                <a href={`mailto:${c.email}`} className="text-accent hover:underline text-sm">{c.email}</a>
              </div>
            )}
            {c.linkedin && (
              <div className="text-sm text-slate-500">
                <strong>LinkedIn:</strong>{' '}
                <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-sm">
                  {c.linkedin.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
