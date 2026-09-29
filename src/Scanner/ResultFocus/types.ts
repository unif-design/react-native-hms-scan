import type { ScanResult } from '../../types';

export interface ResultFocusProps {
  result: Readonly<ScanResult>;
  bottomInset: number;
  onRescan(): void;
  onConfirm(): void;
}
