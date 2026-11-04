import { useState } from 'react';
import { applyTheme, currentTheme, type ThemeName } from './theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeName>(currentTheme);
  const dark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      title={dark ? 'Dark mode' : 'Light mode'}
      className={`relative h-6 w-11 shrink-0 rounded-full p-0.5 ${dark ? 'bg-pine' : 'bg-line'}`}
      onClick={() => {
        const next: ThemeName = dark ? 'light' : 'dark';
        applyTheme(next);
        setTheme(next);
      }}
    >
      <span
        aria-hidden="true"
        className={`block size-5 rounded-full bg-white shadow transition-transform duration-200 ${
          dark ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
