import NativeHmsScan from './NativeHmsScan';
import type { CameraPermissionStatus } from './types';

function normalize(status: string): CameraPermissionStatus {
  switch (status) {
    case 'granted':
    case 'denied':
    case 'blocked':
    case 'undetermined':
      return status;
    default:
      return 'undetermined';
  }
}

/** 查询当前相机权限状态（不弹窗）。 */
export async function getCameraPermissionStatus(): Promise<CameraPermissionStatus> {
  return normalize(await NativeHmsScan.getCameraPermissionStatus());
}

/**
 * 发起相机权限请求（必要时弹系统授权框），返回请求后的状态。
 * 若用户已永久拒绝（blocked），需引导去系统设置开启。
 */
export async function requestCameraPermission(): Promise<CameraPermissionStatus> {
  return normalize(await NativeHmsScan.requestCameraPermission());
}
