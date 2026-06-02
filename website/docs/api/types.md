---
sidebar_position: 4
title: 类型
description: "@unif/react-native-hms-scan 所有公开类型的完整定义——BarcodeFormat、ScanResult、ScanProduct、HmsScanError 等。"
---

# 类型

`@unif/react-native-hms-scan` 所有公开类型的完整定义。

---

## 引用

```ts
import type {
  BarcodeFormat,
  BarcodeContentType,
  ScanCornerPoint,
  ScanResult,
  DecodeImageOptions,
  CameraPermissionStatus,
  HmsScanErrorCode,
  ScanProduct,
  HmsScanViewProps,
  TorchStatus,
  ScannerProps,
} from '@unif/react-native-hms-scan';

import { HmsScanError, ALL_BARCODE_FORMATS } from '@unif/react-native-hms-scan';
```

---

## BarcodeFormat

统一码制枚举（两端归一）。

```ts
type BarcodeFormat =
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
```

`ALL_BARCODE_FORMATS` 常量包含除 `UNKNOWN` 外的所有码制，传给 `formats` 即"识别全部码制"。

---

## BarcodeContentType

码内容语义类型（尽力归一）。Android 来自 `HmsScan.getScanTypeForm()`，iOS 来自 `sceneType`（精度有限，未知归 `OTHER`）。

```ts
type BarcodeContentType =
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
```

---

## ScanCornerPoint

取景框 / 解码命中的角点（图像坐标系，单位 px）。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `x` | `number` | 横坐标 |
| `y` | `number` | 纵坐标 |

---

## ScanResult

一次扫码 / 解码命中的结果。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `value` | `string` | ✅ | 原始解码文本（Android `getOriginalValue` / iOS `text`） |
| `format` | `BarcodeFormat` | ✅ | 码制 |
| `contentType` | `BarcodeContentType` | — | 内容语义类型（可能缺省） |
| `cornerPoints` | `ScanCornerPoint[]` | — | 条码四角点（可能缺省） |

---

## DecodeImageOptions

`decodeImage` 的可选配置。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `formats` | `BarcodeFormat[]` | 限定识别码制；不传 = 全部 |

---

## CameraPermissionStatus

相机权限状态。

| 值 | 说明 |
| --- | --- |
| `'granted'` | 已授权 |
| `'denied'` | 用户本次拒绝（可再次请求） |
| `'blocked'` | 永久拒绝（需引导去系统设置） |
| `'undetermined'` | 尚未请求过权限 |

---

## HmsScanErrorCode

库统一错误码。

| 值 | 说明 |
| --- | --- |
| `'E_NO_CAMERA_PERMISSION'` | 缺少相机权限 |
| `'E_NO_READ_PERMISSION'` | 缺少相册读取权限 |
| `'E_CAMERA_INIT'` | 相机初始化失败 |
| `'E_DECODE_FAILED'` | 解码失败 |
| `'E_IMAGE_LOAD_FAILED'` | 图片加载失败 |
| `'E_NO_RESULT'` | 未识别到码 |
| `'E_UNKNOWN'` | 其他未知错误 |

---

## HmsScanError

库统一抛出的错误类，继承自 `Error`。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `code` | `HmsScanErrorCode` | 错误码 |
| `message` | `string` | 错误描述 |
| `name` | `string` | 固定为 `'HmsScanError'` |

```ts
try {
  await decodeImage(uri);
} catch (e) {
  if (e instanceof HmsScanError) {
    // e.code / e.message
  }
}
```

---

## ScanProduct

业务层商品信息——`<Scanner>` 扫到条码后，由宿主通过 `resolveProduct` 解析返回，用于浮层确认卡展示。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | `string` | ✅ | 商品名 |
| `brand` | `string` | — | 品牌（如 "统一"） |
| `brandChar` | `string` | — | 字母牌字符；缺省时取 `brand` 或 `name` 的首字 |
| `barcode` | `string` | — | 条码；缺省时取扫到的 `value` |
| `spec` | `string` | — | 规格（如 "500ml × 15 瓶/箱"） |
| `stockShort` | `string` | — | 库存短描述（如 "充足"） |
| `price` | `string` | — | 价格展示串（如 "¥5.50"） |
| `priceCaption` | `string` | — | 价格下方副标题，默认 "建议零售" |

---

## 平台兼容性

类型定义在所有平台均可使用（不含运行时代码）。

| 平台 | 支持 |
| --- | --- |
| iOS | ✅ |
| Android | ✅ |
| Web | ✅ |

---

## 相关

- [API 参考 → Scanner](/docs/api/scanner) — `ScannerProps` / `ScanProduct` 使用场景
- [API 参考 → HmsScanView](/docs/api/hms-scan-view) — `HmsScanViewProps` / `TorchStatus`
- [API 参考 → 函数](/docs/api/functions) — 使用这些类型的函数签名
