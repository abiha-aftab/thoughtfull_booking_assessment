import { describe, expect, it } from 'vitest';
import { applyTheme, currentTheme } from './theme';

describe('theme', () => {
  it('switches the document between light and dark', () => {
    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(currentTheme()).toBe('light');
    expect(localStorage.getItem('thoughtfull-theme')).toBe('light');

    applyTheme('dark');
    expect(currentTheme()).toBe('dark');
    expect(localStorage.getItem('thoughtfull-theme')).toBe('dark');
  });
});
