import NativeHmsScan from './NativeHmsScan';
import { scanError } from './errors';
import { ScanError } from './ScanError';
import type { ScanCameraPermission } from './types';

async function permission(request: boolean): Promise<ScanCameraPermission> {
  if (!NativeHmsScan)
    throw new ScanError({
      reason: 'unavailable',
      message: 'HMS Scan 原生模块未安装',
    });
  try {
    const status = await (request
      ? NativeHmsScan.requestCameraPermission()
      : NativeHmsScan.getCameraPermissionStatus());
    if (
      status === 'granted' ||
      status === 'denied' ||
      status === 'blocked' ||
      status === 'undetermined'
    )
      return status;
    throw new ScanError({
      reason: 'invalid_response',
      message: '原生相机权限状态无法识别',
    });
  } catch (error) {
    throw scanError(error, {
      reason: 'unavailable',
      message: '读取相机权限失败',
    });
  }
}
/** Reads the actual status without presenting a system permission prompt. */
export function getCameraPermissionStatus(): Promise<ScanCameraPermission> {
  return permission(false);
}
export function requestCameraPermission(): Promise<ScanCameraPermission> {
  return permission(true);
}
