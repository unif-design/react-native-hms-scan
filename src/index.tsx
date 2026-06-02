// @unif/react-native-hms-scan —— 华为 HMS 统一扫码服务 RN bridge(Fabric 新架构)
// 能力：定制视图扫码（底层 <HmsScanView> + 成品 <Scanner> 扫一扫页）+ 图片识别（decodeImage）+ 相机权限。

// ── 类型与常量 ──
export {
  ALL_BARCODE_FORMATS,
  HmsScanError,
} from './types';
export type {
  BarcodeFormat,
  BarcodeContentType,
  ScanCornerPoint,
  ScanResult,
  DecodeImageOptions,
  CameraPermissionStatus,
  HmsScanErrorCode,
  ScanProduct,
} from './types';

// ── 码制工具 ──
export { coerceFormat, coerceContentType, formatsToCsv } from './format';

// ── 底层 headless 相机组件 ──
export { HmsScanView } from './HmsScanView';
export type { HmsScanViewProps, TorchStatus } from './HmsScanView';

// ── 图片识别 ──
export { decodeImage } from './decodeImage';

// ── 相机权限 ──
export { getCameraPermissionStatus, requestCameraPermission } from './permissions';

// ── 成品扫一扫页（聚焦款，浅色） ──
export { Scanner } from './Scanner/Scanner';
export type { ScannerProps } from './Scanner/Scanner';
