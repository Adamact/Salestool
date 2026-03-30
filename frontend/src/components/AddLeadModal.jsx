import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import SlidePanel from './SlidePanel';

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

    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Ogiltig e-postadress');
      return;
    }

    if (form.phone.trim() && form.phone.trim().length < 7) {
      setError('Telefonnumret måste vara minst 7 tecken');
      return;
    }

    if (form.website.trim() && !/^https?:\/\//.test(form.website.trim())) {
      setError('Webbsidan måste börja med http:// eller https://');
      return;
    }

    if (form.linkedin.trim() && !/^https?:\/\//.test(form.linkedin.trim())) {
      setError('LinkedIn-länken måste börja med http:// eller https://');
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

  const inputClasses = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30';

  return (
    <SlidePanel open={true} onClose={onClose} title="Lägg till lead" width={520}>
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-5 space-y-0">
          {error && (
            <div className="rounded-lg bg-red-50 text-red-600 text-sm p-3 mb-5">{error}</div>
          )}

          {/* Företagsinfo */}
          <div className="border-b border-slate-100 pb-5 mb-5">
            <div className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Företagsinfo
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Företag *</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={form.company}
                  onChange={(e) => handleChange('company', e.target.value)}
                  placeholder="Företagsnamn AB"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Bransch</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={form.industry}
                  onChange={(e) => handleChange('industry', e.target.value)}
                  placeholder="t.ex. Transport / Vägtransport"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Stad / Region</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={form.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="t.ex. Göteborg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Kategori</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={form.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  placeholder="t.ex. Transport, Bygg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Storlek (anställda)</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={form.size}
                  onChange={(e) => handleChange('size', e.target.value)}
                  placeholder="t.ex. 50–100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tier</label>
                <select
                  className={inputClasses}
                  value={form.tier}
                  onChange={(e) => handleChange('tier', e.target.value)}
                >
                  <option value="">Välj tier...</option>
                  <option value="Tier 1">Tier 1</option>
                  <option value="Tier 2">Tier 2</option>
                  <option value="Tier 3">Tier 3</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Webbsida</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={form.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://www.example.se/"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">LinkedIn (företag)</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={form.linkedin}
                  onChange={(e) => handleChange('linkedin', e.target.value)}
                  placeholder="https://linkedin.com/company/..."
                />
              </div>
            </div>
          </div>

          {/* Kontaktperson */}
          <div className="border-b border-slate-100 pb-5 mb-5">
            <div className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Kontaktperson
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Namn</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={form.contact_name}
                  onChange={(e) => handleChange('contact_name', e.target.value)}
                  placeholder="Förnamn Efternamn"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Titel</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="t.ex. VD"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Telefon</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="070-123 45 67"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">E-post</label>
                <input
                  type="email"
                  className={inputClasses}
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="namn@foretag.se"
                />
              </div>
            </div>
          </div>

          {/* Beskrivning */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Beskrivning / Anteckning
            </label>
            <textarea
              className={`${inputClasses} resize-y`}
              rows="2"
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Varför är detta en bra lead?"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-slate-200 bg-white px-5 py-4 flex justify-end gap-3">
          <button
            type="button"
            className="bg-slate-100 text-slate-600 rounded-lg px-5 py-2.5 text-sm"
            onClick={onClose}
          >
            Avbryt
          </button>
          <button
            type="submit"
            className="bg-accent text-white rounded-lg px-5 py-2.5 text-sm"
            disabled={saving}
          >
            {saving ? 'Sparar...' : 'Lägg till'}
          </button>
        </div>
      </form>
    </SlidePanel>
  );
}
