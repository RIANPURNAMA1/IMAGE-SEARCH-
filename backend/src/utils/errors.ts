import type { ErrorBody } from '../types';

export type ErrorCode =
  | 'NO_FILE'
  | 'FILE_EMPTY'
  | 'UNSUPPORTED_TYPE'
  | 'FILE_TOO_LARGE'
  | 'INVALID_UPLOAD'
  | 'RATE_LIMITED'
  | 'NOT_CONFIGURED'
  | 'PROVIDER_AUTH_FAILED'
  | 'PROVIDER_QUOTA_EXCEEDED'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_ERROR'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR';

/** Error yang pesannya aman ditampilkan ke pengguna. */
export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;

  constructor(status: number, code: ErrorCode, message: string) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

export function errorBody(code: ErrorCode, message: string): ErrorBody {
  return { success: false, error: { code, message } };
}
