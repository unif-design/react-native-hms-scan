import {
  ALL_BARCODE_FORMATS,
  type BarcodeContentType,
  type BarcodeFormat,
  type ScanCornerPoint,
  type ScanResult,
} from './types';

const FORMAT_SET = new Set<string>([...ALL_BARCODE_FORMATS, 'UNKNOWN']);

const CONTENT_TYPES: readonly BarcodeContentType[] = [
  'TEXT',
  'URL',
  'EMAIL',
  'PHONE',
  'SMS',
  'WIFI',
  'CONTACT',
  'EVENT',
  'LOCATION',
  'DRIVER',
  'ISBN',
  'ARTICLE',
  'OTHER',
];
const CONTENT_SET = new Set<string>(CONTENT_TYPES);

/** 把任意字符串安全收敛成 BarcodeFormat（未知归 UNKNOWN）。 */
export function coerceFormat(value: unknown): BarcodeFormat {
  return typeof value === 'string' && FORMAT_SET.has(value)
    ? (value as BarcodeFormat)
    : 'UNKNOWN';
}

/** 把任意字符串安全收敛成 BarcodeContentType（未知/缺省 → undefined）。 */
export function coerceContentType(value: unknown): BarcodeContentType | undefined {
  return typeof value === 'string' && CONTENT_SET.has(value)
    ? (value as BarcodeContentType)
    : undefined;
}

/** formats[] → 逗号分隔 CSV（传给原生）；空/未传 → ''（= 全部码制）。 */
export function formatsToCsv(formats?: readonly BarcodeFormat[]): string {
  return formats && formats.length > 0 ? formats.join(',') : '';
}

function coerceCornerPoints(value: unknown): ScanCornerPoint[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const points = value
    .filter(
      (p): p is { x: number; y: number } =>
        !!p && typeof p.x === 'number' && typeof p.y === 'number'
    )
    .map((p) => ({ x: p.x, y: p.y }));
  return points.length > 0 ? points : undefined;
}

function coerceResult(raw: unknown): ScanResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  // 没有有效 value 的命中无意义，丢弃
  if (typeof r.value !== 'string' || r.value.length === 0) return null;
  const result: ScanResult = {
    value: r.value,
    format: coerceFormat(r.format),
  };
  const contentType = coerceContentType(r.contentType);
  if (contentType) result.contentType = contentType;
  const cornerPoints = coerceCornerPoints(r.cornerPoints);
  if (cornerPoints) result.cornerPoints = cornerPoints;
  return result;
}

/**
 * 解析原生回传的 JSON 字符串 → 强类型 ScanResult[]。
 * 任何脏数据都被安全过滤；解析失败返回空数组而非抛错。
 */
export function parseResultsJson(json: string): ScanResult[] {
  if (!json) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: ScanResult[] = [];
  for (const item of parsed) {
    const r = coerceResult(item);
    if (r) out.push(r);
  }
  return out;
}
