import { Router } from 'express';
import type { AppConfig } from '../config';

/** Status server tanpa mengungkap secret: hanya boolean "configured". */
export function createHealthRouter(config: AppConfig): Router {
  const router = Router();
  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      configured: Boolean(config.serpapiApiKey),
      maxUploadBytes: config.maxUploadBytes,
      timestamp: new Date().toISOString(),
    });
  });
  return router;
}
