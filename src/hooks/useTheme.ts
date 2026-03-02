import { useState, useEffect } from 'react';

const THEME_STORAGE_KEY = 'recall-theme';
const THEME_EVENT = 'recall-theme-changed';

function getStoredTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return (localStorage.getItem(THEME_STORAGE_KEY) as 'light' | 'dark') || 'dark';
}

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return getStoredTheme();
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
  }, [theme]);

  useEffect(() => {
    const syncFromStorage = () => setTheme(getStoredTheme());
    const syncFromEvent = (event: Event) => {
      const nextTheme = (event as CustomEvent<'light' | 'dark'>).detail;
      if (nextTheme) setTheme(nextTheme);
    };

    window.addEventListener('storage', syncFromStorage);
    window.addEventListener(THEME_EVENT, syncFromEvent);

    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener(THEME_EVENT, syncFromEvent);
    };
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return { theme, toggleTheme };
}
