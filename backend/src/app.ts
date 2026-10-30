import { existsSync } from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import type { Express } from 'express';
import helmet from 'helmet';
import type { AppConfig } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { createHealthRouter } from './routes/health';
import { createSearchRouter } from './routes/search';
import { type LensClient, SerpApiClient } from './services/serpapiClient';

export interface CreateAppOptions {
  config: AppConfig;
  /** Untuk pengujian. Bila kosong, klien SerpApi dibuat dari config.serpapiApiKey. */
  client?: LensClient;
  rateLimitPerMinute?: number;
  /** Folder build frontend. Default: ../../frontend/dist relatif terhadap file ini. */
  frontendDist?: string;
}

export function createApp({ config, client, rateLimitPerMinute, frontendDist }: CreateAppOptions): Express {
  const app = express();
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", 'https://fonts.googleapis.com'],
          styleSrcAttr: ["'unsafe-inline'"],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          // Thumbnail hasil pencarian berasal dari berbagai domain eksternal.
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: null,
        },
      },
    }),
  );

  app.use(
    cors({
      origin: config.clientOrigins,
      methods: ['GET', 'POST'],
      maxAge: 600,
    }),
  );

  const lensClient =
    client ??
    (config.serpapiApiKey
      ? new SerpApiClient({
          apiKey: config.serpapiApiKey,
          uploadTimeoutMs: config.uploadTimeoutMs,
          searchTimeoutMs: config.searchTimeoutMs,
          logger: {
            warn: (message, meta) => console.warn(`[serpapi] ${message}`, meta ?? {}),
          },
        })
      : undefined);

  app.use('/api', createHealthRouter(config));
  app.use('/api', createSearchRouter({ config, client: lensClient, rateLimitPerMinute }));
  app.use('/api', notFoundHandler);

  // Mode produksi: backend ikut menyajikan hasil build frontend bila tersedia.
  const distPath = frontendDist ?? path.resolve(__dirname, '../../frontend/dist');
  if (existsSync(path.join(distPath, 'index.html'))) {
    app.use(express.static(distPath, { index: false, maxAge: '1h' }));
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
