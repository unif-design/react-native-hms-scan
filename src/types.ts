// ──────────────────────────────────────────────────────────────
// @unif/react-native-hms-scan —— 公共类型
//
// 这些是纯 JS/TS 类型与常量（不触碰原生），index 与 mock 都从这里导出。
// 码制 / 内容类型在原生侧（Android HmsScan.*_SCAN_TYPE / getScanTypeForm，
// iOS HMSScanFormatTypeCode / sceneType）已统一映射成下面的字符串枚举再回 JS。
// ──────────────────────────────────────────────────────────────

/** 统一码制枚举（两端归一）。 */
export type BarcodeFormat =
  | 'QR_CODE'
  | 'AZTEC'
  | 'DATA_MATRIX'
  | 'PDF417'
  | 'CODABAR'
  | 'CODE_39'
  | 'CODE_93'
  | 'CODE_128'
  | 'EAN_8'
  | 'EAN_13'
  | 'UPC_A'
  | 'UPC_E'
  | 'ITF14'
  | 'MULTI_FUNCTIONAL'
  | 'UNKNOWN';

/** 所有可用码制（不含 UNKNOWN）。传给原生即"识别全部码制"。 */
export const ALL_BARCODE_FORMATS: readonly BarcodeFormat[] = [
  'QR_CODE',
  'AZTEC',
  'DATA_MATRIX',
  'PDF417',
  'CODABAR',
  'CODE_39',
  'CODE_93',
  'CODE_128',
  'EAN_8',
  'EAN_13',
  'UPC_A',
  'UPC_E',
  'ITF14',
  'MULTI_FUNCTIONAL',
] as const;

/**
 * 码内容语义类型（尽力归一）。
 * Android 来自 HmsScan.getScanTypeForm()，iOS 来自 sceneType（精度有限，未知归 OTHER）。
 */
export type BarcodeContentType =
  | 'TEXT'
  | 'URL'
  | 'EMAIL'
  | 'PHONE'
  | 'SMS'
  | 'WIFI'
  | 'CONTACT'
  | 'EVENT'
  | 'LOCATION'
  | 'DRIVER'
  | 'ISBN'
  | 'ARTICLE'
  | 'OTHER';

/** 取景框/解码命中的角点（图像坐标系，单位 px）。 */
export interface ScanCornerPoint {
  x: number;
  y: number;
}

/** 一次扫码/解码命中的结果。 */
export interface ScanResult {
  /** 原始解码文本（Android getOriginalValue / iOS text）。 */
  value: string;
  /** 码制。 */
  format: BarcodeFormat;
  /** 内容语义类型（可能缺省）。 */
  contentType?: BarcodeContentType;
  /** 条码四角点（可能缺省）。 */
  cornerPoints?: ScanCornerPoint[];
}

/** decodeImage 选项。 */
export interface DecodeImageOptions {
  /** 限定识别码制；不传 = 全部。 */
  formats?: BarcodeFormat[];
}

/** 相机权限状态。 */
export type CameraPermissionStatus =
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'undetermined';

/** 错误码。 */
export type HmsScanErrorCode =
  | 'E_NO_CAMERA_PERMISSION'
  | 'E_NO_READ_PERMISSION'
  | 'E_CAMERA_INIT'
  | 'E_DECODE_FAILED'
  | 'E_IMAGE_LOAD_FAILED'
  | 'E_NO_RESULT'
  | 'E_UNKNOWN';

/** 库统一抛出的错误类型。 */
export class HmsScanError extends Error {
  readonly code: HmsScanErrorCode;
  constructor(code: HmsScanErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'HmsScanError';
    this.code = code;
    // 兼容 TS 继承内建类的 instanceof
    Object.setPrototypeOf(this, HmsScanError.prototype);
  }
}

/**
 * 业务层商品信息——`<Scanner>` 扫到条码后，由宿主通过 resolveProduct 解析返回，
 * 用于聚焦款"浮层确认卡"展示。仅 name 必填，其余可缺省。
 */
export interface ScanProduct {
  /** 商品名（必填）。 */
  name: string;
  /** 品牌（如 "统一"）。 */
  brand?: string;
  /** 字母牌字符；缺省时取 brand 或 name 的首字。 */
  brandChar?: string;
  /** 条码；缺省时取扫到的 value。 */
  barcode?: string;
  /** 规格（如 "500ml × 15 瓶/箱"）。 */
  spec?: string;
  /** 库存短描述（如 "充足"）。 */
  stockShort?: string;
  /** 价格展示串（如 "¥5.50"）。 */
  price?: string;
  /** 价格下方副标题，默认 "建议零售"。 */
  priceCaption?: string;
}
