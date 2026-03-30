import { useState, useEffect, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'salestool-settings';

const DEFAULTS = {
  // Appearance
  theme: 'light',           // 'light' | 'dark'
  accentColor: '#6366f1',   // hex color
  fontSize: 'normal',       // 'compact' | 'normal' | 'large'
  // Calling
  celebrationAnimation: true,
  autoAdvance: true,        // advance to next lead after logging (non-power-dial)
  confirmDelete: true,      // confirm before deleting leads
  // Display
  defaultTab: 'contacts',   // 'contacts' | 'notes' | 'timeline' | 'manus'
  showCallbackQueue: true,
  sidebarLeadInfo: 'company+contact', // 'company' | 'company+contact' | 'company+phone'
  dateFormat: 'sv-SE',      // 'sv-SE' | 'en-US'
  // Data
  defaultSort: 'created_at', // column name
  defaultSortDir: 'desc',
};

function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULTS, ...JSON.parse(stored) };
    }
  } catch {
    // corrupted storage, use defaults
  }
  return { ...DEFAULTS };
}

export function useSettings() {
  const [settings, setSettingsState] = useState(loadSettings);

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', settings.theme === 'dark');
    root.style.setProperty('--color-accent', settings.accentColor);
    root.style.setProperty('--color-accent-hover', adjustColor(settings.accentColor, -15));
    root.style.setProperty('--color-accent-light', adjustColor(settings.accentColor, 85, 0.15));

    // Font size
    const sizeMap = { compact: '13px', normal: '14px', large: '16px' };
    root.style.fontSize = sizeMap[settings.fontSize] || '14px';
  }, [settings.theme, settings.accentColor, settings.fontSize]);

  const updateSetting = useCallback((key, value) => {
    setSettingsState((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateSettings = useCallback((partial) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSettingsState({ ...DEFAULTS });
  }, []);

  return useMemo(() => ({
    settings,
    updateSetting,
    updateSettings,
    resetSettings,
    DEFAULTS,
  }), [settings, updateSetting, updateSettings, resetSettings]);
}

// Lighten/darken a hex color
function adjustColor(hex, amount, alpha) {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  let g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  let b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  if (alpha !== undefined) {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
