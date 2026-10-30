import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { searchByImageFile } from '../src/services/searchService';
import type { LensClient } from '../src/services/serpapiClient';
import { SYNTHETIC_LENS_RESPONSE } from './fixtures';
import { fakeImage, PNG_HEAD } from './helpers';

let dir: string;
let filePath: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'isf-test-'));
  filePath = path.join(dir, 'x.upload');
  await writeFile(filePath, fakeImage(PNG_HEAD, 50));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('searchByImageFile', () => {
  it('menjalankan upload lalu Lens dengan image_id dan menormalisasi hasil', async () => {
    const calls: string[] = [];
    const client: LensClient = {
      async uploadImage(data, mime) {
        calls.push(`upload:${data.byteLength}:${mime}`);
        return 'id-1';
      },
      async googleLens(id) {
        calls.push(`lens:${id}`);
        return SYNTHETIC_LENS_RESPONSE;
      },
    };
    let t = 1000;
    const outcome = await searchByImageFile({ filePath, mimeType: 'image/png', client, now: () => (t += 25) });

    expect(calls).toEqual(['upload:50:image/png', 'lens:id-1']);
    expect(outcome.meta.provider).toBe('SerpApi Google Lens');
    expect(outcome.meta.total).toBe(outcome.results.length);
    expect(outcome.meta.exactMatchCount).toBe(1);
    expect(outcome.meta.discarded).toBe(2);
    expect(outcome.meta.durationMs).toBe(25);
    expect(outcome.related).toHaveLength(1);
  });

  it('mengembalikan hasil kosong yang jujur bila provider tidak mengirim kecocokan', async () => {
    const client: LensClient = {
      uploadImage: async () => 'id-2',
      googleLens: async () => ({}),
    };
    const outcome = await searchByImageFile({ filePath, mimeType: 'image/png', client });
    expect(outcome.results).toEqual([]);
    expect(outcome.meta.total).toBe(0);
  });

  it('meneruskan error provider dan tidak memanggil Lens bila upload gagal', async () => {
    let lensCalled = false;
    const client: LensClient = {
      uploadImage: async () => {
        throw new Error('upload gagal');
      },
      googleLens: async () => {
        lensCalled = true;
        return {};
      },
    };
    let message = '';
    try {
      await searchByImageFile({ filePath, mimeType: 'image/png', client });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toBe('upload gagal');
    expect(lensCalled).toBe(false);
  });
});
