import NativeHmsScan from './NativeHmsScan';
import { formatsToCsv, parseResultsJson } from './format';
import { HmsScanError, type DecodeImageOptions, type ScanResult } from './types';

/**
 * 从本地图片解码条码 / 二维码（华为 Bitmap 模式）。
 *
 * @param uri 本地图片：file:// / content:// / ph:// / 绝对路径。**不下载远程 URL**，
 *            如需识别网络图请宿主先下载到本地再传入。
 * @param options 可选；formats 限定码制，不传 = 全部。
 * @returns 命中的结果数组（可能为空）。
 * @throws HmsScanError 图片加载失败 / 读权限缺失等。
 */
export async function decodeImage(
  uri: string,
  options?: DecodeImageOptions
): Promise<ScanResult[]> {
  if (!uri) {
    throw new HmsScanError('E_IMAGE_LOAD_FAILED', 'decodeImage: uri 不能为空');
  }
  try {
    const json = await NativeHmsScan.decodeImage(uri, formatsToCsv(options?.formats));
    return parseResultsJson(json);
  } catch (e) {
    // 原生 reject 的 code 透传为 HmsScanError
    const err = e as { code?: string; message?: string };
    if (
      err.code === 'E_NO_READ_PERMISSION' ||
      err.code === 'E_IMAGE_LOAD_FAILED' ||
      err.code === 'E_DECODE_FAILED'
    ) {
      throw new HmsScanError(err.code, err.message);
    }
    throw new HmsScanError('E_UNKNOWN', err.message ?? 'decodeImage failed');
  }
}
