import type { SCAN_FORMATS, SCAN_CONTENT_TYPES } from './constants';

export type ScanFormat = (typeof SCAN_FORMATS)[number];
export type RequestedScanFormat = Exclude<ScanFormat, 'UNKNOWN'>;

export type ScanContentType = (typeof SCAN_CONTENT_TYPES)[number];

export interface ScanPoint {
  x: number;
  y: number;
}
export interface ScanResult {
  /** Unmodified decoded text. */
  value: string;
  format: ScanFormat;
  contentType?: ScanContentType;
  /** Coordinates in the recognition image, not screen coordinates. */
  cornerPoints?: readonly ScanPoint[];
}
export interface ScanFailure {
  reason:
    | 'invalid_input'
    | 'permission_denied'
    | 'image_unavailable'
    | 'decode_failed'
    | 'invalid_response'
    | 'unavailable'
    | 'unsupported';
  message: string;
  sourceCode?: string;
}
export interface DecodeScanImageInput {
  /** A readable local file URI, borrowed until this operation settles. */
  uri: string;
  formats?: readonly RequestedScanFormat[];
}
export type ScanCameraPermission =
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'undetermined';
export interface ScanTorchState {
  on: boolean;
  available?: boolean;
  lowLight?: boolean;
}
export interface ScannerImage {
  uri: string;
  onSourceReleased?(): void;
}

/** Native rejection payload; internal to the capability boundary. */
export interface NativeScanFailure {
  code?: unknown;
  message?: unknown;
}
