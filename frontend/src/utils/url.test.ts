import { describe, expect, it } from 'vitest';
import { safeHttpUrl } from './url';

describe('safeHttpUrl', () => {
  it('hanya meloloskan http dan https', () => {
    expect(safeHttpUrl('https://example.test/a')).toBe('https://example.test/a');
    expect(safeHttpUrl('http://example.test')).toBe('http://example.test/');
  });

  it('menolak skema lain, kredensial, URL relatif, dan non-string', () => {
    expect(safeHttpUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeHttpUrl('data:text/html,<b>x</b>')).toBeUndefined();
    expect(safeHttpUrl('https://u:p@example.test')).toBeUndefined();
    expect(safeHttpUrl('/relatif')).toBeUndefined();
    expect(safeHttpUrl(123)).toBeUndefined();
    expect(safeHttpUrl(undefined)).toBeUndefined();
  });
});
