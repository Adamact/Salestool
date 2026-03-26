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
    <div className="contacts-panel">
      <div className="contacts-panel__header">
        <h3 className="contacts-panel__title">Kontaktpersoner ({contacts.length})</h3>
        <button className="btn btn--primary btn--sm" onClick={handleAdd}>
          + Lägg till
        </button>
      </div>

      {showForm && (
        <div className="contacts-panel__form">
          <h4 className="contacts-panel__form-title">
            {editingId ? 'Redigera kontakt' : 'Ny kontakt'}
          </h4>
          <div className="contacts-panel__form-grid">
            <div className="contacts-panel__field">
              <label>Namn</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Förnamn Efternamn"
              />
            </div>
            <div className="contacts-panel__field">
              <label>Titel / Roll</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="t.ex. VD, Inköpschef"
              />
            </div>
            <div className="contacts-panel__field">
              <label>Telefon (direkt)</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="08-123 456"
              />
            </div>
            <div className="contacts-panel__field">
              <label>Mobil</label>
              <input
                type="tel"
                value={form.phone_mobile}
                onChange={(e) => handleChange('phone_mobile', e.target.value)}
                placeholder="070-123 45 67"
              />
            </div>
            <div className="contacts-panel__field">
              <label>E-post</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="namn@foretag.se"
              />
            </div>
            <div className="contacts-panel__field">
              <label>Avdelning</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => handleChange('department', e.target.value)}
                placeholder="t.ex. Försäljning, IT"
              />
            </div>
            <div className="contacts-panel__field contacts-panel__field--full">
              <label>LinkedIn</label>
              <input
                type="url"
                value={form.linkedin}
                onChange={(e) => handleChange('linkedin', e.target.value)}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
          </div>
          <div className="contacts-panel__form-actions">
            <button className="btn btn--secondary" onClick={handleCancel}>Avbryt</button>
            <button className="btn btn--primary" onClick={handleSave}>
              {editingId ? 'Spara' : 'Lägg till'}
            </button>
          </div>
        </div>
      )}

      {contacts.length === 0 && !showForm && (
        <p className="contacts-panel__empty">Inga kontaktpersoner tillagda</p>
      )}

      <div className="contacts-panel__list">
        {contacts.map((c) => (
          <div key={c.id} className={`contact-card ${c.is_primary ? 'contact-card--primary' : ''}`}>
            <div className="contact-card__header">
              <div className="contact-card__name-row">
                <span className="contact-card__name">{c.name || 'Namnlös'}</span>
                {c.is_primary ? (
                  <span className="contact-card__primary-badge">Primär</span>
                ) : null}
              </div>
              <div className="contact-card__actions">
                {!c.is_primary && (
                  <button
                    className="contact-card__action"
                    onClick={() => handleSetPrimary(c.id)}
                    title="Gör till primär kontakt"
                  >
                    ★
                  </button>
                )}
                <button
                  className="contact-card__action"
                  onClick={() => handleEdit(c)}
                  title="Redigera"
                >
                  ✎
                </button>
                <button
                  className="contact-card__action contact-card__action--delete"
                  onClick={() => handleDelete(c.id)}
                  title="Ta bort"
                >
                  ✕
                </button>
              </div>
            </div>
            {c.title && <div className="contact-card__title">{c.title}</div>}
            {c.department && <div className="contact-card__detail"><strong>Avdelning:</strong> {c.department}</div>}
            <div className="contact-card__phones">
              {c.phone && (
                <span className="contact-card__detail">
                  <strong>Tel:</strong>{' '}
                  <a href={`tel:${c.phone}`} className="contact-card__phone-link">{c.phone}</a>
                </span>
              )}
              {c.phone_mobile && (
                <span className="contact-card__detail">
                  <strong>Mobil:</strong>{' '}
                  <a href={`tel:${c.phone_mobile}`} className="contact-card__phone-link">{c.phone_mobile}</a>
                </span>
              )}
            </div>
            {c.email && (
              <div className="contact-card__detail">
                <strong>E-post:</strong>{' '}
                <a href={`mailto:${c.email}`} className="contact-card__email-link">{c.email}</a>
              </div>
            )}
            {c.linkedin && (
              <div className="contact-card__detail">
                <strong>LinkedIn:</strong>{' '}
                <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="contact-card__email-link">
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
