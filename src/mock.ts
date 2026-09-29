import type { FC } from 'react';
import type {
  DecodeScanImageInput,
  ScanCameraPermission,
  ScanResult,
} from './types';
import type { HmsScanViewProps } from './HmsScanView/types';
import type { ScannerProps } from './Scanner/types';

export { ScanError } from './ScanError';
export type {
  ScanFormat,
  RequestedScanFormat,
  ScanContentType,
  ScanPoint,
  ScanResult,
  ScanFailure,
  DecodeScanImageInput,
  ScanCameraPermission,
  ScanTorchState,
  ScannerImage,
} from './types';
export type { HmsScanViewProps, ScannerProps };
export const decodeImage = jest.fn(
  (_input: Readonly<DecodeScanImageInput>): Promise<readonly ScanResult[]> =>
    Promise.resolve([])
);
export const getCameraPermissionStatus = jest.fn(
  (): Promise<ScanCameraPermission> => Promise.resolve('granted')
);
export const requestCameraPermission = jest.fn(
  (): Promise<ScanCameraPermission> => Promise.resolve('granted')
);
export const HmsScanView: FC<HmsScanViewProps> = () => null;
export const Scanner: FC<ScannerProps> = () => null;
