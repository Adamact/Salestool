import React, { useState } from 'react';
import clsx from 'clsx';
import SlidePanel from './SlidePanel';

const ACCENT_PRESETS = [
  { color: '#6366f1', label: 'Indigo' },
  { color: '#3b82f6', label: 'Blue' },
  { color: '#22c55e', label: 'Green' },
  { color: '#ef4444', label: 'Red' },
  { color: '#f59e0b', label: 'Amber' },
  { color: '#ec4899', label: 'Pink' },
  { color: '#8b5cf6', label: 'Violet' },
  { color: '#14b8a6', label: 'Teal' },
  { color: '#f97316', label: 'Orange' },
  { color: '#64748b', label: 'Slate' },
];

const TABS = [
  { id: 'appearance', label: 'Utseende', icon: PaletteIcon },
  { id: 'calling', label: 'Samtal', icon: PhoneIcon },
  { id: 'display', label: 'Visning', icon: LayoutIcon },
  { id: 'shortcuts', label: 'Kortkommandon', icon: KeyboardIcon },
];

export default function SettingsPanel({ open, onClose, settings, onUpdateSetting, onReset }) {
  const [activeTab, setActiveTab] = useState('appearance');

  return (
    <SlidePanel open={open} onClose={onClose} title="Installningar" width={540}>
      <div className="flex h-full">
        {/* Tab sidebar */}
        <nav className="w-40 flex-shrink-0 border-r border-slate-100 bg-slate-50/50 py-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={clsx(
                'w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left',
                activeTab === tab.id
                  ? 'bg-accent/10 text-accent font-medium border-r-2 border-accent'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className="w-4 h-4 flex-shrink-0" />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-light">
          {activeTab === 'appearance' && (
            <AppearanceTab settings={settings} onChange={onUpdateSetting} />
          )}
          {activeTab === 'calling' && (
            <CallingTab settings={settings} onChange={onUpdateSetting} />
          )}
          {activeTab === 'display' && (
            <DisplayTab settings={settings} onChange={onUpdateSetting} />
          )}
          {activeTab === 'shortcuts' && <ShortcutsTab />}

          {/* Reset */}
          <div className="px-6 py-6 border-t border-slate-100 mt-4">
            <button
              onClick={onReset}
              className="text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              Aterstall standardinstallningar
            </button>
          </div>
        </div>
      </div>
    </SlidePanel>
  );
}

// ── Appearance Tab ──────────────────────────────────────────────────────

function AppearanceTab({ settings, onChange }) {
  return (
    <div className="p-6 space-y-8">
      <Section title="Tema" description="Valj ljust eller morkt utseende">
        <div className="flex gap-3">
          <ThemeCard
            active={settings.theme === 'light'}
            onClick={() => onChange('theme', 'light')}
            label="Ljust"
          >
            <div className="w-full h-16 rounded-md bg-white border border-slate-200 p-2 space-y-1">
              <div className="h-2 w-12 rounded bg-slate-200" />
              <div className="h-2 w-8 rounded bg-slate-100" />
              <div className="h-2 w-16 rounded bg-slate-100" />
            </div>
          </ThemeCard>
          <ThemeCard
            active={settings.theme === 'dark'}
            onClick={() => onChange('theme', 'dark')}
            label="Morkt"
          >
            <div className="w-full h-16 rounded-md bg-slate-800 border border-slate-600 p-2 space-y-1">
              <div className="h-2 w-12 rounded bg-slate-600" />
              <div className="h-2 w-8 rounded bg-slate-700" />
              <div className="h-2 w-16 rounded bg-slate-700" />
            </div>
          </ThemeCard>
        </div>
      </Section>

      <Section title="Accentfarg" description="Anvands for knappar, lankar och markeringar">
        <div className="flex flex-wrap gap-2">
          {ACCENT_PRESETS.map(({ color, label }) => (
            <button
              key={color}
              title={label}
              onClick={() => onChange('accentColor', color)}
              className={clsx(
                'w-9 h-9 rounded-lg transition-all duration-150',
                settings.accentColor === color
                  ? 'ring-2 ring-offset-2 ring-current scale-110'
                  : 'hover:scale-105'
              )}
              style={{ backgroundColor: color, color }}
            >
              {settings.accentColor === color && (
                <svg className="w-4 h-4 mx-auto text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Textstorlek" description="Justerar textstorlek i hela appen">
        <SegmentedControl
          options={[
            { value: 'compact', label: 'Kompakt' },
            { value: 'normal', label: 'Normal' },
            { value: 'large', label: 'Stor' },
          ]}
          value={settings.fontSize}
          onChange={(v) => onChange('fontSize', v)}
        />
      </Section>
    </div>
  );
}

// ── Calling Tab ─────────────────────────────────────────────────────────

function CallingTab({ settings, onChange }) {
  return (
    <div className="p-6 space-y-6">
      <Section title="Samtalsinstallningar">
        <ToggleRow
          label="Firande-animation"
          description="Visa animation nar du bokar ett mote"
          checked={settings.celebrationAnimation}
          onChange={(v) => onChange('celebrationAnimation', v)}
        />
        <ToggleRow
          label="Ga vidare automatiskt"
          description="Navigera till nasta lead efter att du loggat ett samtal"
          checked={settings.autoAdvance}
          onChange={(v) => onChange('autoAdvance', v)}
        />
        <ToggleRow
          label="Bekrafta borttagning"
          description="Visa bekraftelsedialog innan leads raderas"
          checked={settings.confirmDelete}
          onChange={(v) => onChange('confirmDelete', v)}
        />
      </Section>
    </div>
  );
}

// ── Display Tab ─────────────────────────────────────────────────────────

function DisplayTab({ settings, onChange }) {
  return (
    <div className="p-6 space-y-8">
      <Section title="Standardflik" description="Vilken flik som visas nar du valjer en lead">
        <SegmentedControl
          options={[
            { value: 'contacts', label: 'Kontakter' },
            { value: 'notes', label: 'Anteckningar' },
            { value: 'timeline', label: 'Tidslinje' },
            { value: 'manus', label: 'Manus' },
          ]}
          value={settings.defaultTab}
          onChange={(v) => onChange('defaultTab', v)}
        />
      </Section>

      <Section title="Sidebar lead-info" description="Vad som visas under foretagsnamnet i leadlistan">
        <SegmentedControl
          options={[
            { value: 'company', label: 'Enbart foretag' },
            { value: 'company+contact', label: 'Foretag + kontakt' },
            { value: 'company+phone', label: 'Foretag + telefon' },
          ]}
          value={settings.sidebarLeadInfo}
          onChange={(v) => onChange('sidebarLeadInfo', v)}
        />
      </Section>

      <Section title="Visa-alternativ">
        <ToggleRow
          label="Aterringsko"
          description="Visa widgeten for aterringsko i sidopanelen"
          checked={settings.showCallbackQueue}
          onChange={(v) => onChange('showCallbackQueue', v)}
        />
      </Section>

      <Section title="Datumformat">
        <SegmentedControl
          options={[
            { value: 'sv-SE', label: '2026-03-30' },
            { value: 'en-US', label: '03/30/2026' },
          ]}
          value={settings.dateFormat}
          onChange={(v) => onChange('dateFormat', v)}
        />
      </Section>

      <Section title="Standardsortering" description="Hur leads sorteras som standard">
        <div className="flex gap-3">
          <select
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30"
            value={settings.defaultSort}
            onChange={(e) => onChange('defaultSort', e.target.value)}
          >
            <option value="created_at">Skapad</option>
            <option value="updated_at">Uppdaterad</option>
            <option value="company">Foretag</option>
            <option value="status">Status</option>
            <option value="priority">Prioritet</option>
            <option value="city">Stad</option>
          </select>
          <select
            className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30"
            value={settings.defaultSortDir}
            onChange={(e) => onChange('defaultSortDir', e.target.value)}
          >
            <option value="desc">Nyast forst</option>
            <option value="asc">Aldst forst</option>
          </select>
        </div>
      </Section>
    </div>
  );
}

// ── Shortcuts Tab ───────────────────────────────────────────────────────

const SHORTCUTS = [
  { keys: 'Enter', desc: 'Logga samtal for valt lead' },
  { keys: 'N', desc: 'Hoppa till nasta lead' },
  { keys: '\u2191 / \u2193', desc: 'Navigera i leadlistan' },
  { keys: '1-9', desc: 'Valj samtalsresultat' },
  { keys: 'Ctrl+K', desc: 'Oppna kommandopaletten' },
  { keys: 'Escape', desc: 'Stang oppna paneler' },
  { keys: 'Ctrl+Enter', desc: 'Spara samtal (i dialogen)' },
];

function ShortcutsTab() {
  return (
    <div className="p-6">
      <Section title="Kortkommandon" description="Tangentbordsgenvagar for snabbare arbete">
        <div className="space-y-1">
          {SHORTCUTS.map(({ keys, desc }) => (
            <div key={keys} className="flex items-center justify-between py-2.5 px-1">
              <span className="text-sm text-slate-600">{desc}</span>
              <kbd className="text-xs font-mono text-slate-500 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md">
                {keys}
              </kbd>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ── Shared UI Components ────────────────────────────────────────────────

function Section({ title, description, children }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      {description && <p className="text-xs text-slate-500 mt-0.5 mb-3">{description}</p>}
      {!description && <div className="mt-2" />}
      {children}
    </div>
  );
}

function ThemeCard({ active, onClick, label, children }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex-1 rounded-xl p-3 border-2 transition-all duration-150 text-left',
        active
          ? 'border-accent bg-accent/5 shadow-sm'
          : 'border-slate-200 hover:border-slate-300 bg-white'
      )}
    >
      {children}
      <div className={clsx('text-xs font-medium mt-2 text-center', active ? 'text-accent' : 'text-slate-500')}>
        {label}
      </div>
    </button>
  );
}

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={clsx(
            'px-3.5 py-1.5 text-xs font-medium rounded-md transition-all duration-150',
            value === opt.value
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <label className="flex items-center justify-between py-3 cursor-pointer group">
      <div>
        <div className="text-sm text-slate-700 group-hover:text-slate-900">{label}</div>
        {description && <div className="text-xs text-slate-400 mt-0.5">{description}</div>}
      </div>
      <div
        className={clsx(
          'relative w-10 h-5.5 rounded-full transition-colors duration-200 flex-shrink-0 ml-4',
          checked ? 'bg-accent' : 'bg-slate-200'
        )}
        onClick={(e) => { e.preventDefault(); onChange(!checked); }}
      >
        <div
          className={clsx(
            'absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked && 'translate-x-[18px]'
          )}
        />
      </div>
    </label>
  );
}

// ── Icons ───────────────────────────────────────────────────────────────

function PaletteIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" /><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" /><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}

function PhoneIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

function LayoutIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );
}

function KeyboardIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
      <line x1="6" y1="8" x2="6.01" y2="8" /><line x1="10" y1="8" x2="10.01" y2="8" />
      <line x1="14" y1="8" x2="14.01" y2="8" /><line x1="18" y1="8" x2="18.01" y2="8" />
      <line x1="8" y1="12" x2="8.01" y2="12" /><line x1="12" y1="12" x2="12.01" y2="12" />
      <line x1="16" y1="12" x2="16.01" y2="12" />
      <line x1="7" y1="16" x2="17" y2="16" />
    </svg>
  );
}
