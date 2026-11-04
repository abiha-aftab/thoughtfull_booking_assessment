export const THEME_STORAGE_KEY = 'thoughtfull-theme';

export type ThemeName = 'light' | 'dark';

export function currentTheme(): ThemeName {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The choice still applies for this visit when storage is blocked.
  }
}
