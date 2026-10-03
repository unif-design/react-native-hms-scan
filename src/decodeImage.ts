import NativeHmsScan from './NativeHmsScan';
import { formatsToCsv, parseResultsJson } from './format';
import { scanError } from './errors';
import { ScanError } from './ScanError';
import type { DecodeScanImageInput, ScanResult } from './types';

export async function decodeImage(
  input: Readonly<DecodeScanImageInput>
): Promise<readonly ScanResult[]> {
  // No remote authority, empty filename, fragment, query or malformed escapes.
  const uri = input?.uri;
  if (
    typeof uri !== 'string' ||
    !/^file:\/\/\/(?:[^?#\s]+\/)*[^/?#\s]+$/i.test(uri)
  ) {
    throw new ScanError({
      reason: 'invalid_input',
      message: 'decodeImage 需要可读的 file URI',
    });
  }
  try {
    decodeURIComponent(uri);
  } catch {
    throw new ScanError({
      reason: 'invalid_input',
      message: '图片 URI 编码无效',
    });
  }
  const csv = formatsToCsv(input.formats);
  if (!NativeHmsScan)
    throw new ScanError({
      reason: 'unavailable',
      message: 'HMS Scan 原生模块未安装',
    });
  try {
    return parseResultsJson(await NativeHmsScan.decodeImage(uri, csv));
  } catch (error) {
    throw scanError(error, {
      reason: 'decode_failed',
      message: '图片识别失败',
    });
  }
}
