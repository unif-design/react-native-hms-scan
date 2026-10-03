import { unsupportedScanError } from './errors';
import type { ScanCameraPermission } from './types';

export async function getCameraPermissionStatus(): Promise<ScanCameraPermission> {
  throw unsupportedScanError();
}
export async function requestCameraPermission(): Promise<ScanCameraPermission> {
  throw unsupportedScanError();
}
