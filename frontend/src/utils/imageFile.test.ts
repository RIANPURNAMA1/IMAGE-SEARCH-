import { describe, expect, it } from 'vitest';
import { MAX_SELECT_BYTES, validateSelectedFile } from './imageFile';

const file = (name: string, type: string, size: number) => ({ name, type, size });

describe('validateSelectedFile', () => {
  it('menerima JPG, PNG, dan WebP', () => {
    expect(validateSelectedFile(file('a.jpg', 'image/jpeg', 1000))).toBeNull();
    expect(validateSelectedFile(file('a.PNG', 'image/png', 1000))).toBeNull();
    expect(validateSelectedFile(file('a.webp', 'image/webp', 1000))).toBeNull();
  });

  it('menolak format lain, file kosong, dan file terlalu besar', () => {
    expect(validateSelectedFile(file('a.gif', 'image/gif', 1000))).toMatch(/Format/);
    expect(validateSelectedFile(file('a.png', 'image/jpeg', 1000))).not.toBeNull();
    expect(validateSelectedFile(file('a.png', 'image/png', 0))).toMatch(/kosong/);
    expect(validateSelectedFile(file('a.png', 'image/png', MAX_SELECT_BYTES + 1))).toMatch(/besar/);
  });
});
