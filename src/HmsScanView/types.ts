import type { ViewProps } from 'react-native';
import type {
  RequestedScanFormat,
  ScanFailure,
  ScanResult,
  ScanTorchState,
} from '../types';

export interface HmsScanViewProps extends ViewProps {
  formats?: readonly RequestedScanFormat[];
  continuous?: boolean;
  paused?: boolean;
  torch?: boolean;
  onScanResult?(results: readonly ScanResult[]): void;
  onScanError?(error: Readonly<ScanFailure>): void;
  onTorchState?(state: Readonly<ScanTorchState>): void;
}
