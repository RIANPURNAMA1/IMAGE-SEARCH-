import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, searchImage } from '../services/api';
import { OptimizeError, optimizeImage } from '../services/imageOptimizer';
import type { SearchPhase, SearchSuccess, UiError } from '../types';
import { validateSelectedFile } from '../utils/imageFile';

const RETRYABLE_CODES = new Set([
  'NETWORK_ERROR',
  'TIMEOUT',
  'PROVIDER_TIMEOUT',
  'PROVIDER_UNAVAILABLE',
  'PROVIDER_ERROR',
  'INTERNAL_ERROR',
  'INVALID_RESPONSE',
]);

function toUiError(error: unknown): UiError {
  if (error instanceof ApiError) {
    return { code: error.code, message: error.message, retryable: RETRYABLE_CODES.has(error.code) };
  }
  if (error instanceof OptimizeError) {
    return { code: 'OPTIMIZE_FAILED', message: error.message, retryable: false };
  }
  return { code: 'UNKNOWN_ERROR', message: 'Terjadi kesalahan yang tidak terduga. Coba lagi.', retryable: true };
}

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

export function useImageSearch(maxUploadBytes: number) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [phase, setPhase] = useState<SearchPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [outcome, setOutcome] = useState<SearchSuccess | null>(null);
  const [error, setError] = useState<UiError | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const previewRef = useRef<string | null>(null);

  const replacePreview = useCallback((next: string | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next;
    setPreviewUrl(next);
  }, []);

  const cancelInFlight = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase('idle');
    setProgress(0);
  }, []);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  const selectFile = useCallback(
    (candidate: File) => {
      const problem = validateSelectedFile(candidate);
      if (problem) {
        setFileError(problem);
        return;
      }
      cancelInFlight();
      setFileError(null);
      setError(null);
      setOutcome(null);
      setFile(candidate);
      replacePreview(URL.createObjectURL(candidate));
    },
    [cancelInFlight, replacePreview],
  );

  const clear = useCallback(() => {
    cancelInFlight();
    setFile(null);
    setFileError(null);
    setError(null);
    setOutcome(null);
    replacePreview(null);
  }, [cancelInFlight, replacePreview]);

  const submit = useCallback(async () => {
    if (!file || abortRef.current) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    setOutcome(null);
    setProgress(0);
    setPhase('optimizing');

    try {
      // Sisakan margin kecil di bawah batas server.
      const prepared = await optimizeImage(file, Math.floor(maxUploadBytes * 0.97));
      if (controller.signal.aborted) return;

      setPhase('uploading');
      const result = await searchImage(prepared, {
        signal: controller.signal,
        onUploadProgress: setProgress,
        onUploadComplete: () => {
          setProgress(100);
          setPhase('searching');
        },
      });
      if (controller.signal.aborted) return;
      setOutcome(result);
    } catch (caught) {
      if (isAbort(caught) || controller.signal.aborted) return;
      setError(toUiError(caught));
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setPhase('idle');
      }
    }
  }, [file, maxUploadBytes]);

  return {
    file,
    previewUrl,
    fileError,
    phase,
    progress,
    outcome,
    error,
    busy: phase !== 'idle',
    selectFile,
    clear,
    submit,
  };
}
