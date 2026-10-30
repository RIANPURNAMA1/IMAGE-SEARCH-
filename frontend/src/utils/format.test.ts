import { describe, expect, it } from 'vitest';
import { formatBytes } from './format';

describe('formatBytes', () => {
  it('memformat B, KB, dan MB dengan koma desimal', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1,5 KB');
    expect(formatBytes(204800)).toBe('200 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5,0 MB');
  });

  it('menangani nilai tidak valid', () => {
    expect(formatBytes(-1)).toBe('-');
    expect(formatBytes(Number.NaN)).toBe('-');
  });
});
