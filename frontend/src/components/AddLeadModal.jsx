import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';

const EMPTY_FORM = {
  company: '',
  contact_name: '',
  title: '',
  phone: '',
  email: '',
  industry: '',
  city: '',
  website: '',
  linkedin: '',
  size: '',
  tier: '',
  description: '',
  category: '',
};

export default function AddLeadModal({ onClose, onCreated }) {
  const api = useApi();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company.trim()) {
      setError('Företagsnamn krävs');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const customFields = {};
      if (form.website.trim()) customFields.website = form.website.trim();
      if (form.linkedin.trim()) customFields.linkedin = form.linkedin.trim();
      if (form.size.trim()) customFields.size = form.size.trim();
      if (form.tier.trim()) customFields.tier = form.tier.trim();
      if (form.description.trim()) customFields.description = form.description.trim();
      if (form.category.trim()) customFields.category = form.category.trim();

      await api.createLead({
        company: form.company.trim(),
        contact_name: form.contact_name.trim() || null,
        title: form.title.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        industry: form.industry.trim() || null,
        city: form.city.trim() || null,
        custom_fields: Object.keys(customFields).length > 0 ? customFields : null,
      });

      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      setError(err.message || 'Kunde inte spara lead');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>Lägg till lead</h3>
          <button className="modal__close" onClick={onClose}>{'\u2715'}</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal__body">
            {error && <div className="add-lead__error">{error}</div>}

            <div className="add-lead__section">
              <div className="add-lead__section-title">Företagsinfo</div>
              <div className="add-lead__grid">
                <div className="add-lead__field add-lead__field--full">
                  <label>Företag *</label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                    placeholder="Företagsnamn AB"
                    autoFocus
                  />
                </div>
                <div className="add-lead__field">
                  <label>Bransch</label>
                  <input
                    type="text"
                    value={form.industry}
                    onChange={(e) => handleChange('industry', e.target.value)}
                    placeholder="t.ex. Transport / Vägtransport"
                  />
                </div>
                <div className="add-lead__field">
                  <label>Stad / Region</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="t.ex. Göteborg"
                  />
                </div>
                <div className="add-lead__field">
                  <label>Kategori</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    placeholder="t.ex. Transport, Bygg"
                  />
                </div>
                <div className="add-lead__field">
                  <label>Storlek (anställda)</label>
                  <input
                    type="text"
                    value={form.size}
                    onChange={(e) => handleChange('size', e.target.value)}
                    placeholder="t.ex. 50–100"
                  />
                </div>
                <div className="add-lead__field">
                  <label>Tier</label>
                  <select value={form.tier} onChange={(e) => handleChange('tier', e.target.value)}>
                    <option value="">Välj tier...</option>
                    <option value="Tier 1">Tier 1</option>
                    <option value="Tier 2">Tier 2</option>
                    <option value="Tier 3">Tier 3</option>
                  </select>
                </div>
                <div className="add-lead__field">
                  <label>Webbsida</label>
                  <input
                    type="text"
                    value={form.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder="https://www.example.se/"
                  />
                </div>
                <div className="add-lead__field">
                  <label>LinkedIn (företag)</label>
                  <input
                    type="text"
                    value={form.linkedin}
                    onChange={(e) => handleChange('linkedin', e.target.value)}
                    placeholder="https://linkedin.com/company/..."
                  />
                </div>
              </div>
            </div>

            <div className="add-lead__section">
              <div className="add-lead__section-title">Kontaktperson</div>
              <div className="add-lead__grid">
                <div className="add-lead__field">
                  <label>Namn</label>
                  <input
                    type="text"
                    value={form.contact_name}
                    onChange={(e) => handleChange('contact_name', e.target.value)}
                    placeholder="Förnamn Efternamn"
                  />
                </div>
                <div className="add-lead__field">
                  <label>Titel</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="t.ex. VD"
                  />
                </div>
                <div className="add-lead__field">
                  <label>Telefon</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="070-123 45 67"
                  />
                </div>
                <div className="add-lead__field">
                  <label>E-post</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="namn@foretag.se"
                  />
                </div>
              </div>
            </div>

            <div className="add-lead__section">
              <div className="add-lead__field add-lead__field--full">
                <label>Beskrivning / Anteckning</label>
                <textarea
                  className="modal__textarea"
                  rows="2"
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Varför är detta en bra lead?"
                />
              </div>
            </div>
          </div>

          <div className="modal__footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>Avbryt</button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Sparar...' : 'Lägg till'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
