---
sidebar_position: 3
title: 函数
description: "decodeImage(uri, options?)（本地图片解码，URI 规则两端有别、空数组非错误）、getCameraPermissionStatus / requestCameraPermission（granted/denied/blocked/undetermined）、码制工具 coerceFormat / coerceContentType / formatsToCsv 完整签名。"
---

# 函数

`@unif/react-native-hms-scan` 导出的所有函数。

```tsx
import {
  decodeImage,
  getCameraPermissionStatus,
  requestCameraPermission,
  coerceFormat,
  coerceContentType,
  formatsToCsv,
} from '@unif/react-native-hms-scan';
```

| 函数 | 作用 | 触碰原生 |
| --- | --- | --- |
| [`decodeImage`](#decode-image) | 从本地图片解码条码 / 二维码 | ✅ |
| [`getCameraPermissionStatus`](#get-status) | 查询相机权限状态（不弹窗） | ✅ |
| [`requestCameraPermission`](#request) | 请求相机权限（必要时弹窗） | ✅ |
| [`coerceFormat`](#coerce-format) | 字符串安全收敛为 `BarcodeFormat` | ❌ 纯函数 |
| [`coerceContentType`](#coerce-content-type) | 字符串安全收敛为 `BarcodeContentType` | ❌ 纯函数 |
| [`formatsToCsv`](#formats-to-csv) | `readonly BarcodeFormat[]` → 逗号分隔 CSV | ❌ 纯函数 |

---

## decodeImage {#decode-image}

从**本地**图片解码条码 / 二维码（华为 Bitmap 模式）。**不走相机**，是独立的识图路径。

### 签名

```ts
function decodeImage(
  uri: string,
  options?: DecodeImageOptions
): Promise<ScanResult[]>
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `uri` | `string` | ✅ | 本地图片 URI / 路径，见下方[接受的 URI](#accepted-uri)。**不下载远程 URL** |
| `options` | `DecodeImageOptions` | — | 可选配置 |
| `options.formats` | `readonly BarcodeFormat[]` | — | 限定识别码制；不传 = 全部 |

### 接受的 URI {#accepted-uri}

只接受**本地** URI；两端接受的形式略有差异（源自各自原生实现）：

| 形式 | Android | iOS |
| --- | --- | --- |
| `file:///...`（文件 URI） | ✅ | ✅ |
| 绝对路径（无 scheme，如 `/data/.../a.jpg`） | ✅ | ✅ |
| `data:...`（base64 等） | ❌ | ✅ |
| `content://...`（Android Content URI） | ✅ | ❌ |
| `android.resource://...` | ✅ | ❌ |
| `ph://...`（iOS 相册）/ `assets-library://` | ❌ | ❌ |
| `http(s)://...`（远程 URL） | ❌ | ❌ |

:::tip 跨平台最稳的输入：`file://` 或绝对路径
两端都稳的输入是 **`file://` 或绝对路径**。`content://` **仅 Android**；iOS **不接受 `ph://`**（相册 URI）。从相册选图时，让图片选择器（如 `react-native-image-picker`）返回**本地文件路径**再传入，最省心。
:::

### 返回值

`Promise<ScanResult[]>` — 命中的结果数组。**图中无码时 resolve 空数组 `[]`，不抛错**（最易踩的坑：别把 `!results.length` 当失败抛异常）。

### 错误 {#errors}

真正的失败才抛 `HmsScanError`（带 `code`）：

| `code` | 触发场景 |
| --- | --- |
| `E_IMAGE_LOAD_FAILED` | 路径无效 / 非本地 uri（如远程 URL、iOS 的 `ph://`）/ 格式不支持 |
| `E_DECODE_FAILED` | 解码过程异常 |
| `E_NO_READ_PERMISSION` | 公共类型中的兼容保留值;当前两端 native 不产生 |
| `E_UNKNOWN` | 其他未知错误（非上述 code 的原生异常统一收敛于此） |

图片选择器和 URI grant 负责让所选文件可读;`decodeImage` 自身不申请相册权限。Android `content://` grant 失效或 URI 不可读时,当前表现为 `E_IMAGE_LOAD_FAILED`。

| 场景 | 结果 |
| --- | --- |
| 图里没码 | resolve `[]`（**不抛错**） |
| 传了远程 URL / 非本地 uri / 路径无效 | 抛 `E_IMAGE_LOAD_FAILED` |
| 解码过程异常 | 抛 `E_DECODE_FAILED` |

### 示例

```tsx
import { decodeImage, HmsScanError } from '@unif/react-native-hms-scan';

try {
  const results = await decodeImage('file:///var/mobile/photo.jpg', {
    formats: ['QR_CODE', 'EAN_13'],
  });
  if (results.length > 0) {
    const { value, format } = results[0];
    // 处理识别结果
  } else {
    // 空数组 = 图里没码（正常，不是错误）
  }
} catch (e) {
  if (e instanceof HmsScanError) {
    // 当前 decodeImage: E_IMAGE_LOAD_FAILED / E_DECODE_FAILED / E_UNKNOWN
  }
}
```

更多用法见[指南 → 图片识别](/docs/guides/decode-image)。

---

## getCameraPermissionStatus {#get-status}

查询当前相机权限状态（**不弹**系统授权框）。

### 签名

```ts
function getCameraPermissionStatus(): Promise<CameraPermissionStatus>
```

### 返回值

`Promise<CameraPermissionStatus>`：

| 值 | 说明 |
| --- | --- |
| `'granted'` | 已授权 |
| `'denied'` | 用户拒绝（可再次请求） |
| `'blocked'` | 永久拒绝（需引导去系统设置） |
| `'undetermined'` | 尚未请求过权限 |

:::note Android 查询时只给 granted / denied
Android 查询对任何未授权状态都返回 `denied`,当前不会返回 `undetermined`;只有 `requestCameraPermission` 执行请求后才可能返回 `blocked`。iOS 只可能返回 `granted` / `undetermined` / `blocked` —— 原生把 `denied` 与 `restricted` 都映射为 `blocked`,永远不返回 `denied`。Android 判断 `blocked` 时以请求后的返回为准。
:::

### 示例

```tsx
const status = await getCameraPermissionStatus();
if (status === 'granted') {
  // 可以打开相机
}
```

---

## requestCameraPermission {#request}

发起相机权限请求（必要时弹系统授权框），返回请求后的状态。

### 签名

```ts
function requestCameraPermission(): Promise<CameraPermissionStatus>
```

### 返回值

`Promise<CameraPermissionStatus>` — 请求后的权限状态（取值同 [`getCameraPermissionStatus`](#get-status)）。若返回 `blocked`，系统不再弹框，需引导去系统设置。

Android 必须有当前 `PermissionAwareActivity` 才能弹系统权限框;Activity 缺失或类型不符时 Promise 会 reject,原生 code 为 `E_NO_ACTIVITY`,**不会** resolve 某个权限 status。该 native integration code 当前不在 `HmsScanErrorCode` 联合里,调用方应对普通 reject 做兜底。

### 示例

```tsx
import { Linking } from 'react-native';
import { requestCameraPermission } from '@unif/react-native-hms-scan';

const status = await requestCameraPermission();
if (status === 'granted') {
  // 权限已获取
} else if (status === 'blocked') {
  Linking.openSettings(); // 引导去设置
}
```

完整权限流见[指南 → 权限处理](/docs/guides/permissions)。

---

## 码制工具（纯函数）{#format-utils}

以下三个为纯 JS 工具，不触碰原生，在测试 mock 中也保留**真实实现**。多数业务无需直接调用——`<HmsScanView>` / `decodeImage` 内部已自动使用。

### coerceFormat {#coerce-format}

把任意值安全收敛为 `BarcodeFormat`；不是已知码制（含 `UNKNOWN`）则返回 `'UNKNOWN'`。

```ts
function coerceFormat(value: unknown): BarcodeFormat

coerceFormat('EAN_13'); // 'EAN_13'
coerceFormat('FOO');    // 'UNKNOWN'
coerceFormat(123);      // 'UNKNOWN'
```

### coerceContentType {#coerce-content-type}

把任意值安全收敛为 `BarcodeContentType`；未知 / 缺省返回 `undefined`。

```ts
function coerceContentType(value: unknown): BarcodeContentType | undefined

coerceContentType('URL'); // 'URL'
coerceContentType('FOO'); // undefined
```

### formatsToCsv {#formats-to-csv}

把 `readonly BarcodeFormat[]` 转成传给原生的逗号分隔 CSV；空数组 / 未传 → `''`（= 识别全部码制）。

```ts
function formatsToCsv(formats?: readonly BarcodeFormat[]): string

formatsToCsv(['QR_CODE', 'EAN_13']); // 'QR_CODE,EAN_13'
formatsToCsv([]);                    // ''
formatsToCsv();                      // ''
```

---

## 平台兼容性

| 函数 | iOS | Android | Web |
| --- | --- | --- | --- |
| `decodeImage` | ✅ | ✅ | ❌ |
| `getCameraPermissionStatus` | ✅ | ✅ | ❌ |
| `requestCameraPermission` | ✅ | ✅ | ❌ |
| `coerceFormat` / `coerceContentType` / `formatsToCsv` | ✅ | ✅ | ✅（纯函数） |

---

## 相关

- [API 参考 → 类型](/docs/api/types) — `ScanResult` / `DecodeImageOptions` / `CameraPermissionStatus` / `HmsScanError`
- [指南 → 图片识别](/docs/guides/decode-image) — `decodeImage` 使用场景与 URI 坑
- [指南 → 权限处理](/docs/guides/permissions) — 完整权限管理流程
- [平台差异](/docs/platform-differences) — `decodeImage` URI / 权限的两端差异
