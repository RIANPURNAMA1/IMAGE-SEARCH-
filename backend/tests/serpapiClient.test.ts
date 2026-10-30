import { describe, expect, it } from 'vitest';
import { classifyProviderError, SerpApiClient } from '../src/services/serpapiClient';
import { AppError } from '../src/utils/errors';

const KEY = 'test-key-not-real';

interface Call {
  url: string;
  init: RequestInit;
}

function fakeFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const impl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init: init ?? {} });
    return handler(url, init ?? {});
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (error) {
    return error instanceof AppError ? error.code : 'OTHER';
  }
  return undefined;
}

describe('SerpApiClient.uploadImage', () => {
  it('mengirim multipart ke /image dengan field image dan api_key, lalu mengembalikan image_id', async () => {
    const { impl, calls } = fakeFetch(() => json({ message: 'Image uploaded successfully.', image_id: 'abc123' }));
    const client = new SerpApiClient({ apiKey: KEY, fetchImpl: impl });

    const id = await client.uploadImage(Uint8Array.from([1, 2, 3]), 'image/png');

    expect(id).toBe('abc123');
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://serpapi.com/image');
    expect(calls[0].init.method).toBe('POST');
    const form = calls[0].init.body as FormData;
    expect(form.get('api_key')).toBe(KEY);
    const file = form.get('image') as File;
    expect(file.type).toBe('image/png');
    expect(file.name).toBe('upload.png');
    expect(file.size).toBe(3);
  });

  it('memetakan key `error` provider ke kode yang sesuai tanpa membocorkan teks mentah', async () => {
    const { impl } = fakeFetch(() => json({ error: 'Invalid image format. Supported format: jpg, jpeg, png, webp' }, 400));
    const client = new SerpApiClient({ apiKey: KEY, fetchImpl: impl });
    expect(await codeOf(client.uploadImage(Uint8Array.from([1]), 'image/png'))).toBe('UNSUPPORTED_TYPE');
  });

  it('gagal bila image_id tidak ada pada respons sukses', async () => {
    const { impl } = fakeFetch(() => json({ message: 'ok' }));
    const client = new SerpApiClient({ apiKey: KEY, fetchImpl: impl });
    expect(await codeOf(client.uploadImage(Uint8Array.from([1]), 'image/png'))).toBe('PROVIDER_ERROR');
  });

  it('memetakan kegagalan jaringan ke PROVIDER_UNAVAILABLE dan timeout ke PROVIDER_TIMEOUT', async () => {
    const failing = new SerpApiClient({
      apiKey: KEY,
      fetchImpl: (async () => {
        throw new TypeError('fetch failed');
      }) as unknown as typeof fetch,
    });
    expect(await codeOf(failing.uploadImage(Uint8Array.from([1]), 'image/png'))).toBe('PROVIDER_UNAVAILABLE');

    const timingOut = new SerpApiClient({
      apiKey: KEY,
      fetchImpl: (async () => {
        const error = new Error('aborted');
        error.name = 'TimeoutError';
        throw error;
      }) as unknown as typeof fetch,
    });
    expect(await codeOf(timingOut.uploadImage(Uint8Array.from([1]), 'image/png'))).toBe('PROVIDER_TIMEOUT');
  });
});

describe('SerpApiClient.googleLens', () => {
  it('memanggil /search dengan engine=google_lens, type=all, dan image_id', async () => {
    const { impl, calls } = fakeFetch(() => json({ search_metadata: { status: 'Success' }, visual_matches: [] }));
    const client = new SerpApiClient({ apiKey: KEY, fetchImpl: impl });

    const result = await client.googleLens('img-42');

    expect(result).toEqual({ search_metadata: { status: 'Success' }, visual_matches: [] });
    const url = new URL(calls[0].url);
    expect(`${url.origin}${url.pathname}`).toBe('https://serpapi.com/search');
    expect(url.searchParams.get('engine')).toBe('google_lens');
    expect(url.searchParams.get('type')).toBe('all');
    expect(url.searchParams.get('image_id')).toBe('img-42');
    expect(url.searchParams.get('api_key')).toBe(KEY);
    expect(calls[0].init.method).toBe('GET');
  });

  it('memperlakukan "tidak ada hasil" dari provider sebagai hasil kosong, bukan error', async () => {
    const { impl } = fakeFetch(() => json({ error: "Google hasn't returned any results for this query." }));
    const client = new SerpApiClient({ apiKey: KEY, fetchImpl: impl });
    expect(await client.googleLens('x')).toEqual({});
  });

  it('memetakan 401, 429, 5xx, dan error teks provider', async () => {
    const run = (status: number, body: unknown) =>
      codeOf(new SerpApiClient({ apiKey: KEY, fetchImpl: fakeFetch(() => json(body, status)).impl }).googleLens('x'));

    expect(await run(401, { error: 'Invalid API key. Your API key should be here: https://serpapi.com/manage-api-key' })).toBe(
      'PROVIDER_AUTH_FAILED',
    );
    expect(await run(429, { error: 'Your account has run out of searches.' })).toBe('PROVIDER_QUOTA_EXCEEDED');
    expect(await run(503, {})).toBe('PROVIDER_UNAVAILABLE');
    expect(await run(200, { error: 'Your account has run out of searches.' })).toBe('PROVIDER_QUOTA_EXCEEDED');
    expect(await run(200, { search_metadata: { status: 'Error' } })).toBe('PROVIDER_ERROR');
    expect(await run(400, { error: 'sesuatu yang aneh' })).toBe('PROVIDER_ERROR');
  });

  it('menangani body non-JSON tanpa melempar error mentah', async () => {
    const { impl } = fakeFetch(() => new Response('<html>oops</html>', { status: 200 }));
    const client = new SerpApiClient({ apiKey: KEY, fetchImpl: impl });
    expect(await codeOf(client.googleLens('x'))).toBe('PROVIDER_ERROR');
  });

  it('tidak mencatat API key ke logger', async () => {
    const logs: string[] = [];
    const { impl } = fakeFetch(() => json({ error: `Invalid API key ${KEY}` }, 401));
    const client = new SerpApiClient({
      apiKey: KEY,
      fetchImpl: impl,
      logger: { warn: (message, meta) => logs.push(`${message} ${JSON.stringify(meta ?? {})}`) },
    });
    await codeOf(client.googleLens('x'));
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.join('\n').includes(KEY)).toBe(false);
  });
});

describe('classifyProviderError', () => {
  it('tidak pernah menyertakan teks provider pada pesan pengguna', () => {
    const error = classifyProviderError(400, 'RAHASIA-INTERNAL-PROVIDER', 'search');
    expect(error.message.includes('RAHASIA')).toBe(false);
  });
});
