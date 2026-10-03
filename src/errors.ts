import { ScanError } from './ScanError';
import { SCAN_ERROR_REASONS } from './constants';
import type { NativeScanFailure, ScanFailure } from './types';

/** Native boundary normalization; Scanner only uses this for its external picker. */
export function scanError(
  error: unknown,
  fallback: Readonly<ScanFailure>
): ScanError {
  if (error instanceof ScanError) return error;
  const raw =
    error && typeof error === 'object' ? (error as NativeScanFailure) : {};
  const sourceCode = typeof raw.code === 'string' ? raw.code : undefined;
  return new ScanError({
    reason: (sourceCode && SCAN_ERROR_REASONS[sourceCode]) || fallback.reason,
    message: typeof raw.message === 'string' ? raw.message : fallback.message,
    ...(sourceCode ? { sourceCode } : {}),
  });
}

export function unsupportedScanError(): ScanError {
  return new ScanError({
    reason: 'unsupported',
    message: 'HMS Scan 仅支持 Android 与 iOS 设备',
  });
}
