---
sidebar_position: 4
title: 类型
description: "@unif/react-native-hms-scan 所有公开类型定义：BarcodeFormat（14 种 + UNKNOWN）、BarcodeContentType、ScanResult、ScanProduct、ScanError、CameraPermissionStatus（granted/denied/blocked/undetermined）、HmsScanErrorCode、HmsScanError、ScanCornerPoint、DecodeImageOptions。"
---

# 类型

`@unif/react-native-hms-scan` 所有公开类型的完整定义。除 `HmsScanError`（运行时类）与 `ALL_BARCODE_FORMATS`（运行时常量）外，本页类型均为纯 TS 类型，不含运行时代码，可在任意平台引用。

```ts
import type {
  BarcodeFormat,
  BarcodeContentType,
  ScanCornerPoint,
  ScanResult,
  ScanError,
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

:::note 单一真相源
本页所有类型逐字取自 `src/types.ts`（外加 `HmsScanViewProps` / `TorchStatus` 来自 `src/HmsScanView.tsx`、`ScannerProps` 来自 `src/Scanner/Scanner.tsx`）。`HmsScanViewProps` / `TorchStatus` / `ScannerProps` 的字段表见各自的 [HmsScanView](/docs/api/hms-scan-view) 与 [Scanner](/docs/api/scanner) 页。
:::

---

## BarcodeFormat {#barcode-format}

统一码制枚举（两端归一）。共 **14 种实际码制** 加一个 `UNKNOWN` 兜底值：

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

- `UNKNOWN` 是兜底值，由 `coerceFormat` 在原生回传无法识别时产生，**不应**主动传给 `formats`。
- `ALL_BARCODE_FORMATS` 常量包含上述 **14 种**（不含 `UNKNOWN`）；不传 `formats` 等价于"识别全部码制"，无需手动传它。
- **iOS 平台差异**：`MULTI_FUNCTIONAL` 在 HUAWEI iOS Scan Kit 无对应码制，作为 `formats` 过滤项在 iOS 上不生效（若 `formats` 只含 `MULTI_FUNCTIONAL` / `UNKNOWN`，iOS 会回退为识别全部码制）。详见[平台差异](/docs/platform-differences#formats)。
- `ITF14` 在 iOS 底层映射到 Scan Kit 的 `ITF`,对外仍返回 `ITF14`。

```ts
import { ALL_BARCODE_FORMATS } from '@unif/react-native-hms-scan';
// ALL_BARCODE_FORMATS: readonly BarcodeFormat[]（14 项，不含 UNKNOWN）
```

---

## BarcodeContentType {#barcode-content-type}

码内容语义类型（尽力归一）。Android 来自 `HmsScan.getScanTypeForm()`，iOS 来自 `sceneType`（精度有限，未知归 `OTHER` / 缺省）。

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

:::note iOS 精度有限
iOS 的 `sceneType` 没有公开枚举，本库只映射少数已知场景，其余返回缺省（`contentType` 被省略）。**不要**把 `contentType` 当作两端一致的精确信号，业务判断建议以 `value` 内容为准。
:::

---

## ScanCornerPoint {#scan-corner-point}

取景框 / 解码命中的角点（图像坐标系，单位 px）。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `x` | `number` | 横坐标（px） |
| `y` | `number` | 纵坐标（px） |

---

## ScanResult {#scan-result}

一次扫码 / 解码命中的结果。`<HmsScanView>` 的 `onScanResult` 与 `decodeImage` 均返回 `ScanResult[]`。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `value` | `string` | ✅ | 原始解码文本（Android `getOriginalValue` / iOS `text`） |
| `format` | `BarcodeFormat` | ✅ | 码制 |
| `contentType` | `BarcodeContentType` | — | 内容语义类型（可能缺省） |
| `cornerPoints` | `ScanCornerPoint[]` | — | 条码四角点（可能缺省） |

:::note 仅有 `value` 与 `format` 必有
原生回传经 `parseResultsJson` / `coerceResult` 防御性收敛：无有效 `value` 的命中被丢弃；`contentType` / `cornerPoints` 缺省时不出现在结果对象上。
:::

---

## DecodeImageOptions {#decode-image-options}

`decodeImage` 的可选配置。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `formats` | `readonly BarcodeFormat[]` | 限定识别码制；不传 = 全部 |

---

## ScanError {#scan-error}

`<Scanner>` / `<HmsScanView>` 的 `onScanError` 回调使用的普通错误对象，不是 `HmsScanError`：

```ts
interface ScanError {
  code: string;
  message: string;
}
```

`<Scanner>` 还会把权限 helper 的失败上报为此类型，可能包括 `E_CAMERA_INIT`、`E_NO_RESULT`、`E_NO_ACTIVITY`、`E_UNKNOWN` 等 code。view error 分三路:`E_NO_RESULT` 是 soft error;`E_NO_CAMERA_PERMISSION` 进入 `denied` 并卸载相机 view;其余 fatal view error 进入可重试的 `error`。权限 helper reject 也进入 `error`。`<HmsScanView>` 当前原生事件为 Android `E_CAMERA_INIT` 与 iOS `E_NO_RESULT`。

---

## CameraPermissionStatus {#camera-permission-status}

相机权限状态。`getCameraPermissionStatus` / `requestCameraPermission` 均返回此类型。

| 值 | 说明 |
| --- | --- |
| `'granted'` | 已授权 |
| `'denied'` | 用户拒绝（可再次请求） |
| `'blocked'` | 永久拒绝（需引导去系统设置） |
| `'undetermined'` | 尚未请求过权限 |

:::note Android 查询时只给 granted / denied
Android `getCameraPermissionStatus` 对任何未授权状态返回 `denied`,当前不会返回 `undetermined`;只有 `requestCameraPermission` 执行请求后才可能返回 `blocked`。iOS 只可能返回 `granted` / `undetermined` / `blocked` —— 原生把 `denied` 与 `restricted` 都映射为 `blocked`,永远不返回 `denied`。详见[平台差异](/docs/platform-differences#permission) 与[权限处理](/docs/guides/permissions#get-status)。
:::

---

## HmsScanErrorCode {#hms-scan-error-code}

库统一错误码（`HmsScanError.code`）。

| 值 | 说明 | 来源 |
| --- | --- | --- |
| `'E_IMAGE_LOAD_FAILED'` | 图片加载失败（路径无效 / 非本地 uri / 格式不支持） | `decodeImage`（两端） |
| `'E_DECODE_FAILED'` | 解码过程异常 | `decodeImage`（两端） |
| `'E_NO_READ_PERMISSION'` | 公共 union 的兼容保留值;当前 native 不产生 | 当前无 native 来源 |
| `'E_CAMERA_INIT'` | 相机 / 预览初始化失败 | `<HmsScanView>` `onScanError`（Android） |
| `'E_NO_RESULT'` | 解码结果为空或无法解析 | `<HmsScanView>` `onScanError`（iOS） |
| `'E_NO_CAMERA_PERMISSION'` | 公共 union 的兼容保留值;当前 native 不产生 | 当前无 native 来源 |
| `'E_UNKNOWN'` | 其他未知错误 | `decodeImage` 兜底 |

:::note 错误码分布
`decodeImage` 当前 native 明确产生 `E_IMAGE_LOAD_FAILED` / `E_DECODE_FAILED`;其他原生异常在 JS 收敛为 `E_UNKNOWN`。图片选择器 / URI grant 负责文件访问,当前 native 不产生 `E_NO_READ_PERMISSION`。`<HmsScanView>` 的相机 / 解码错误经 `onScanError` 回调以 `{ code, message }` 形式上报,**不是** `HmsScanError` 实例。Android `requestCameraPermission` 在没有 `PermissionAwareActivity` 时还可能 reject native integration code `E_NO_ACTIVITY`;它当前不属于该公共 union,也不是 `decodeImage` 的 `HmsScanError`。
:::

---

## HmsScanError {#hms-scan-error}

`decodeImage` 失败时抛出的错误类，继承自内建 `Error`。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `code` | `HmsScanErrorCode` | 错误码（只读） |
| `message` | `string` | 错误描述（默认等于 `code`） |
| `name` | `string` | 固定为 `'HmsScanError'` |

```ts
import { decodeImage, HmsScanError } from '@unif/react-native-hms-scan';

try {
  await decodeImage(uri);
} catch (e) {
  if (e instanceof HmsScanError) {
    // e.code / e.message
  }
}
```

---

## ScanProduct {#scan-product}

业务层商品信息——`<Scanner>` 扫到条码后，由宿主通过 `resolveProduct` 解析返回，用于浮层确认卡展示。仅 `name` 必填，其余可缺省。

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

类型定义本身（不含 `HmsScanError` 运行时行为）在所有平台均可引用。

| 平台 | 支持 |
| --- | --- |
| iOS | ✅ |
| Android | ✅ |
| Web | ✅（仅类型，无运行时扫码能力） |

---

## 相关

- [API 参考 → Scanner](/docs/api/scanner) — `ScannerProps` / `ScanProduct` 使用场景
- [API 参考 → HmsScanView](/docs/api/hms-scan-view) — `HmsScanViewProps` / `TorchStatus`
- [API 参考 → 函数](/docs/api/functions) — 使用这些类型的函数签名
- [平台差异](/docs/platform-differences) — 码制 / 权限 / 手电的两端差异
