import { unsupportedScanError } from './errors';
import type { DecodeScanImageInput, ScanResult } from './types';

export async function decodeImage(
  _input: Readonly<DecodeScanImageInput>
): Promise<readonly ScanResult[]> {
  throw unsupportedScanError();
}
