import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'sakura-settings';

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  fontFamily: string;
  soundEnabled: boolean;
  notifications: boolean;
  language: string;
  autoSave: boolean;
  tabSize: number;
}

const DEFAULTS: Settings = {
  theme: 'dark',
  fontSize: 14,
  fontFamily: 'JetBrains Mono, monospace',
  soundEnabled: true,
  notifications: true,
  language: 'en',
  autoSave: true,
  tabSize: 2,
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(load);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  const save = useCallback((next: Settings) => {
    setSettingsState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch { /* ignore */ }
  }, []);

  const reset = useCallback(() => save({ ...DEFAULTS }), [save]);

  return { settings, save, reset };
}

function applyTheme(theme: Settings['theme']) {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.style.colorScheme = prefersDark ? 'dark' : 'light';
  } else {
    root.style.colorScheme = theme;
  }
}
