import type {
  RequestedScanFormat,
  ScannerImage,
  ScanFailure,
  ScanResult,
} from '../types';

export type Phase =
  | 'init'
  | 'scan'
  | 'processing'
  | 'result'
  | 'empty'
  | 'imageError'
  | 'denied'
  | 'error'
  | 'done'
  | 'closed';
export interface ScannerProps {
  title?: string;
  hintText?: string;
  formats?: readonly RequestedScanFormat[];
  topInset?: number;
  bottomInset?: number;
  showTorch?: boolean;
  autoConfirm?: boolean;
  pickImage?(): Promise<ScannerImage | null>;
  onConfirm(result: Readonly<ScanResult>): void;
  onClose?(): void;
  onError?(error: Readonly<ScanFailure>): void;
}

export interface SelectedResult {
  result: Readonly<ScanResult>;
  delivered: boolean;
}
