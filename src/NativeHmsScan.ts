import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// RN codegen 规范（宿主 App build 时生成 NativeHmsScanSpec）。
// 注：为规避 codegen 对"对象数组 / 字符串字面量联合"的类型限制，
// decodeImage 返回 JSON 编码的 ScanResult[]（由 src/format.ts 解析回强类型），
// 权限状态返回字符串（由 src/permissions.ts 归一）。
export interface Spec extends TurboModule {
  /**
   * 解码本地图片里的条码 / 二维码。
   * @param uri 本地图片。iOS 支持 file://、绝对路径、data:；Android 支持
   *            file://、绝对路径、content://、android.resource://。
   *            两端都不下载远程 URL，也不支持 ph:// / assets-library://。
   * @param formatsCsv 限定码制（逗号分隔的 BarcodeFormat），空串 = 全部。
   * @returns JSON 编码的 ScanResult[]（可能为空数组）。
   */
  decodeImage(uri: string, formatsCsv: string): Promise<string>;

  /** 当前相机权限：'granted' | 'denied' | 'blocked' | 'undetermined'。 */
  getCameraPermissionStatus(): Promise<string>;

  /** 发起相机权限请求，返回请求后的状态字符串。 */
  requestCameraPermission(): Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('HmsScan');
