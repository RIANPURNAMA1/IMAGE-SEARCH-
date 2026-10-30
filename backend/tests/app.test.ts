import { existsSync, readdirSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { type AppConfig, parseConfig } from '../src/config';
import type { LensClient } from '../src/services/serpapiClient';
import { AppError } from '../src/utils/errors';
import { SYNTHETIC_LENS_RESPONSE } from './fixtures';
import { fakeImage, JPEG_HEAD, PNG_HEAD } from './helpers';

let tempDir: string;
let config: AppConfig;

const okClient: LensClient = {
  uploadImage: async () => 'image-id-test',
  googleLens: async () => SYNTHETIC_LENS_RESPONSE,
};

function makeConfig(env: NodeJS.ProcessEnv = {}): AppConfig {
  return { ...parseConfig({ SERPAPI_API_KEY: 'test-key-not-real', ...env }), tempDir };
}

const leftoverFiles = () => (existsSync(tempDir) ? readdirSync(tempDir) : []);

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), 'isf-app-'));
  config = makeConfig();
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('GET /api/health', () => {
  it('melaporkan status tanpa mengungkap API key', async () => {
    const res = await request(createApp({ config, client: okClient })).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.configured).toBe(true);
    expect(JSON.stringify(res.body).includes('test-key-not-real')).toBe(false);
  });

  it('configured=false bila key belum diisi', async () => {
    const res = await request(createApp({ config: makeConfig({ SERPAPI_API_KEY: '' }) })).get('/api/health');
    expect(res.body.configured).toBe(false);
  });
});

describe('POST /api/search', () => {
  it('mengembalikan 503 NOT_CONFIGURED tanpa hasil palsu bila API key belum ada', async () => {
    const app = createApp({ config: makeConfig({ SERPAPI_API_KEY: '' }) });
    const res = await request(app).post('/api/search').attach('image', fakeImage(PNG_HEAD), {
      filename: 'a.png',
      contentType: 'image/png',
    });
    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'NOT_CONFIGURED', message: expect.any(String) },
    });
    expect(leftoverFiles()).toEqual([]);
  });

  it('400 NO_FILE bila tidak ada file', async () => {
    const res = await request(createApp({ config, client: okClient })).post('/api/search');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NO_FILE');
  });

  it('415 untuk format yang tidak didukung', async () => {
    const res = await request(createApp({ config, client: okClient }))
      .post('/api/search')
      .attach('image', Buffer.from('GIF89a'), { filename: 'a.gif', contentType: 'image/gif' });
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_TYPE');
    expect(leftoverFiles()).toEqual([]);
  });

  it('415 bila isi file bukan gambar meski namanya .png, dan file sementara dihapus', async () => {
    const res = await request(createApp({ config, client: okClient }))
      .post('/api/search')
      .attach('image', Buffer.from('ini bukan gambar sama sekali'), { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_TYPE');
    expect(leftoverFiles()).toEqual([]);
  });

  it('400 FILE_EMPTY untuk file kosong', async () => {
    const res = await request(createApp({ config, client: okClient }))
      .post('/api/search')
      .attach('image', Buffer.alloc(0), { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_EMPTY');
    expect(leftoverFiles()).toEqual([]);
  });

  it('413 FILE_TOO_LARGE bila melebihi batas', async () => {
    const small = makeConfig({ MAX_UPLOAD_MB: '0.001' });
    const res = await request(createApp({ config: small, client: okClient }))
      .post('/api/search')
      .attach('image', fakeImage(PNG_HEAD, 5000), { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
    expect(leftoverFiles()).toEqual([]);
  });

  it('200 dengan hasil ternormalisasi, dan file sementara dihapus', async () => {
    const res = await request(createApp({ config, client: okClient }))
      .post('/api/search')
      .attach('image', fakeImage(JPEG_HEAD, 200), { filename: 'foto saya.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.results[0].matchType).toBe('exact');
    expect(res.body.meta.provider).toBe('SerpApi Google Lens');
    expect(res.body.related).toHaveLength(1);
    expect(JSON.stringify(res.body).includes('image-id-test')).toBe(false);
    expect(leftoverFiles()).toEqual([]);
  });

  it('meneruskan error provider dalam format konsisten dan tetap menghapus file', async () => {
    const failing: LensClient = {
      uploadImage: async () => 'id',
      googleLens: async () => {
        throw new AppError(429, 'PROVIDER_QUOTA_EXCEEDED', 'Kuota habis.');
      },
    };
    const res = await request(createApp({ config, client: failing }))
      .post('/api/search')
      .attach('image', fakeImage(PNG_HEAD, 100), { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ success: false, error: { code: 'PROVIDER_QUOTA_EXCEEDED', message: 'Kuota habis.' } });
    expect(leftoverFiles()).toEqual([]);
  });

  it('error tak terduga menjadi 500 generik tanpa stack trace', async () => {
    const broken: LensClient = {
      uploadImage: async () => {
        throw new Error('detail internal /home/user/rahasia');
      },
      googleLens: async () => ({}),
    };
    const res = await request(createApp({ config, client: broken }))
      .post('/api/search')
      .attach('image', fakeImage(PNG_HEAD, 100), { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body).includes('rahasia')).toBe(false);
    expect(leftoverFiles()).toEqual([]);
  });

  it('429 RATE_LIMITED setelah melewati batas permintaan', async () => {
    const app = createApp({ config, client: okClient, rateLimitPerMinute: 2 });
    const send = () =>
      request(app).post('/api/search').attach('image', fakeImage(PNG_HEAD, 100), {
        filename: 'a.png',
        contentType: 'image/png',
      });
    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(200);
    const limited = await send();
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('rute tidak dikenal', () => {
  it('404 JSON untuk /api/* yang tidak ada', async () => {
    const res = await request(createApp({ config, client: okClient })).get('/api/tidak-ada');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
