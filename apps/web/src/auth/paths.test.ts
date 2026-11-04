import { describe, expect, it } from 'vitest';
import { safeNextPath } from './paths';

describe('safeNextPath', () => {
  it('keeps an in-app path and drops an external target', () => {
    expect(safeNextPath('/register')).toBe('/register');
    expect(safeNextPath('https://example.com')).toBe('/');
    expect(safeNextPath('//example.com')).toBe('/');
    expect(safeNextPath(undefined)).toBe('/');
  });
});
