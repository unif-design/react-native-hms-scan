import { SCAN_FORMAT_SET, SCAN_CONTENT_TYPE_SET } from './constants';
import { ScanError } from './ScanError';
import type {
  RequestedScanFormat,
  ScanContentType,
  ScanFormat,
  ScanPoint,
  ScanResult,
} from './types';
export function coerceFormat(value: unknown): ScanFormat {
  return typeof value === 'string' && SCAN_FORMAT_SET.has(value)
    ? (value as ScanFormat)
    : 'UNKNOWN';
}
export function coerceContentType(value: unknown): ScanContentType | undefined {
  return typeof value === 'string' && SCAN_CONTENT_TYPE_SET.has(value)
    ? (value as ScanContentType)
    : undefined;
}
/** Empty means no extra filter. Order and duplicates do not change the filter. */
export function formatsToCsv(value?: readonly RequestedScanFormat[]): string {
  if (value === undefined) return '';
  if (
    !Array.isArray(value) ||
    [...value].some(
      (item) =>
        typeof item !== 'string' ||
        item === 'UNKNOWN' ||
        !SCAN_FORMAT_SET.has(item)
    )
  ) {
    throw new ScanError({
      reason: 'invalid_input',
      message: 'formats 包含无效码制',
    });
  }
  return [...new Set(value)].sort().join(',');
}
export function formatConfiguration(value?: readonly RequestedScanFormat[]) {
  try {
    return { csv: formatsToCsv(value), error: undefined };
  } catch (error) {
    return { csv: '', error: error as ScanError };
  }
}
function cornerPoints(value: unknown): readonly ScanPoint[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const points = value
    .filter(
      (p): p is ScanPoint =>
        !!p &&
        typeof p.x === 'number' &&
        Number.isFinite(p.x) &&
        typeof p.y === 'number' &&
        Number.isFinite(p.y)
    )
    .map((p) => ({ x: p.x, y: p.y }));
  return points.length ? points : undefined;
}
function invalidResponse(): never {
  throw new ScanError({
    reason: 'invalid_response',
    message: '原生扫码结果不符合约定',
  });
}
/** Malformed bridge data is distinct from a successfully decoded empty batch. */
export function parseResultsJson(json: unknown): readonly ScanResult[] {
  let data: unknown;
  if (typeof json !== 'string') return invalidResponse();
  try {
    data = JSON.parse(json);
  } catch {
    return invalidResponse();
  }
  if (!Array.isArray(data)) return invalidResponse();
  return data.map((raw) => {
    if (
      !raw ||
      typeof raw !== 'object' ||
      typeof raw.value !== 'string' ||
      typeof raw.format !== 'string'
    )
      return invalidResponse();
    const result: ScanResult = {
      value: raw.value,
      format: coerceFormat(raw.format),
    };
    const contentType = coerceContentType(raw.contentType);
    const points = cornerPoints(raw.cornerPoints);
    if (contentType !== undefined) result.contentType = contentType;
    if (points !== undefined) result.cornerPoints = points;
    return result;
  });
}
