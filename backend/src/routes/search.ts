import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { open, unlink } from 'node:fs/promises';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import type { AppConfig } from '../config';
import { searchByImageFile } from '../services/searchService';
import type { LensClient } from '../services/serpapiClient';
import type { SearchSuccessBody } from '../types';
import { AppError, errorBody } from '../utils/errors';
import {
  assertDeclaredType,
  assertImageContent,
  MIME_BY_KIND,
  SIGNATURE_BYTES,
} from '../utils/fileValidation';

export interface SearchRouterOptions {
  config: AppConfig;
  client: LensClient | undefined;
  rateLimitPerMinute?: number;
}

async function readHead(filePath: string): Promise<Buffer> {
  const handle = await open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(SIGNATURE_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, SIGNATURE_BYTES, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

export function createSearchRouter({ config, client, rateLimitPerMinute = 10 }: SearchRouterOptions): Router {
  mkdirSync(config.tempDir, { recursive: true });

  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, config.tempDir),
      // Nama acak: nama file pengguna tidak pernah dipakai sebagai path.
      filename: (_req, _file, cb) => cb(null, `${randomUUID()}.upload`),
    }),
    limits: { fileSize: config.maxUploadBytes, files: 1, fields: 0 },
    fileFilter: (_req, file, cb) => {
      try {
        assertDeclaredType(file.originalname, file.mimetype);
        cb(null, true);
      } catch (error) {
        cb(error as Error);
      }
    },
  });

  const limiter = rateLimit({
    windowMs: 60_000,
    limit: rateLimitPerMinute,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      res
        .status(429)
        .json(errorBody('RATE_LIMITED', 'Terlalu banyak permintaan. Tunggu sebentar sebelum mencari lagi.'));
    },
  });

  // Dicek sebelum Multer agar tidak ada file yang ditulis bila API belum dikonfigurasi.
  const requireConfigured: RequestHandler = (_req, _res, next) => {
    if (!client) {
      next(
        new AppError(
          503,
          'NOT_CONFIGURED',
          'API belum dikonfigurasi. Isi SERPAPI_API_KEY pada backend/.env lalu restart server.',
        ),
      );
      return;
    }
    next();
  };

  const receiveUpload: RequestHandler = (req, res, next) => {
    upload.single('image')(req, res, (error: unknown) => (error ? next(error) : next()));
  };

  const handleSearch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const file = req.file;
    try {
      if (!file) {
        throw new AppError(400, 'NO_FILE', 'Tidak ada gambar yang diunggah. Kirim file pada field "image".');
      }
      if (!client) {
        throw new AppError(503, 'NOT_CONFIGURED', 'API belum dikonfigurasi.');
      }

      const head = await readHead(file.path);
      const kind = assertImageContent(file.originalname, file.mimetype, file.size, head);

      const outcome = await searchByImageFile({
        filePath: file.path,
        mimeType: MIME_BY_KIND[kind],
        client,
      });

      const body: SearchSuccessBody = { success: true, ...outcome };
      res.json(body);
    } catch (error) {
      next(error);
    } finally {
      // File sementara selalu dihapus, baik sukses maupun gagal.
      if (file) await unlink(file.path).catch(() => undefined);
    }
  };

  const router = Router();
  router.post('/search', limiter, requireConfigured, receiveUpload, (req, res, next) => {
    void handleSearch(req, res, next);
  });
  return router;
}
