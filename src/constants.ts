import type { ScanFailure } from './types';

/** The one source for public scan formats and input validation. */
export const SCAN_FORMATS = [
  'QR_CODE',
  'AZTEC',
  'DATA_MATRIX',
  'PDF417',
  'CODABAR',
  'CODE_39',
  'CODE_93',
  'CODE_128',
  'EAN_8',
  'EAN_13',
  'UPC_A',
  'UPC_E',
  'ITF14',
  'MULTI_FUNCTIONAL',
  'UNKNOWN',
] as const;
export const SCAN_CONTENT_TYPES = [
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
] as const;

export const SCAN_FORMAT_SET: ReadonlySet<string> = new Set(SCAN_FORMATS);
export const SCAN_CONTENT_TYPE_SET: ReadonlySet<string> = new Set(
  SCAN_CONTENT_TYPES
);

export const SCAN_ERROR_REASONS: Readonly<
  Record<string, ScanFailure['reason']>
> = {
  E_INVALID_INPUT: 'invalid_input',
  E_NO_CAMERA_PERMISSION: 'permission_denied',
  E_NO_READ_PERMISSION: 'permission_denied',
  E_IMAGE_LOAD_FAILED: 'image_unavailable',
  E_DECODE_FAILED: 'decode_failed',
  E_INVALID_RESPONSE: 'invalid_response',
  E_UNSUPPORTED: 'unsupported',
  E_UNSUPPORTED_FORMAT: 'unsupported',
  E_CAMERA_INIT: 'unavailable',
  E_UNAVAILABLE: 'unavailable',
};
