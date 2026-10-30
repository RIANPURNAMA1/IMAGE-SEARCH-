import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { AppError, errorBody } from '../utils/errors';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json(errorBody('NOT_FOUND', 'Endpoint tidak ditemukan.'));
}

/**
 * Semua error berakhir di sini dengan format JSON yang konsisten.
 * Stack trace, path internal, dan body error provider tidak pernah dikirim ke klien.
 */
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) {
    res.end();
    return;
  }

  if (error instanceof AppError) {
    res.status(error.status).json(errorBody(error.code, error.message));
    return;
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      res
        .status(413)
        .json(errorBody('FILE_TOO_LARGE', 'Ukuran gambar melebihi batas yang diizinkan (maksimum 500 KB).'));
      return;
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      res.status(400).json(errorBody('INVALID_UPLOAD', 'Kirim tepat satu file pada field "image".'));
      return;
    }
    res.status(400).json(errorBody('INVALID_UPLOAD', 'Unggahan tidak valid.'));
    return;
  }

  // Hanya nama error yang dicatat; pesan dan stack dapat memuat data sensitif.
  const name = error instanceof Error ? error.name : typeof error;
  console.error('[server] unhandled error', { name });
  res.status(500).json(errorBody('INTERNAL_ERROR', 'Terjadi kesalahan pada server. Coba lagi nanti.'));
}
