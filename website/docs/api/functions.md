---
sidebar_position: 3
title: 函数
description: "decodeImage、getCameraPermissionStatus、requestCameraPermission 完整签名与参数说明。"
---

# 函数

`@unif/react-native-hms-scan` 导出的所有工具函数。

```tsx
import {
  decodeImage,
  getCameraPermissionStatus,
  requestCameraPermission,
} from '@unif/react-native-hms-scan';
```

---

## decodeImage

从本地图片解码条码 / 二维码。

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
| `uri` | `string` | ✅ | 本地图片路径：`file://`、`content://`（Android）、`ph://`（iOS）、绝对路径。**不支持远程 URL** |
| `options` | `DecodeImageOptions` | — | 可选配置 |
| `options.formats` | `BarcodeFormat[]` | — | 限定识别码制；不传 = 全部 |

### 返回值

`Promise<ScanResult[]>` — 命中的结果数组，可能为空数组（图中无码，不抛错）。

### 错误

抛出 `HmsScanError`，错误码如下：

| `code` | 说明 |
| --- | --- |
| `E_IMAGE_LOAD_FAILED` | 图片路径无效或格式不支持 |
| `E_NO_READ_PERMISSION` | 缺少相册读取权限（`READ_MEDIA_IMAGES` / `READ_EXTERNAL_STORAGE`） |
| `E_DECODE_FAILED` | 解码内部失败 |
| `E_UNKNOWN` | 其他未知错误 |

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
  }
} catch (e) {
  if (e instanceof HmsScanError) {
    if (e.code === 'E_NO_READ_PERMISSION') {
      // 引导用户授权
    }
  }
}
```

---

## getCameraPermissionStatus

查询当前相机权限状态（不弹系统授权框）。

### 签名

```ts
function getCameraPermissionStatus(): Promise<CameraPermissionStatus>
```

### 返回值

`Promise<CameraPermissionStatus>` — 当前权限状态：

| 值 | 说明 |
| --- | --- |
| `'granted'` | 已授权 |
| `'denied'` | 用户本次拒绝（可再次请求） |
| `'blocked'` | 永久拒绝（需引导去系统设置） |
| `'undetermined'` | 尚未请求过权限 |

### 示例

```tsx
const status = await getCameraPermissionStatus();
if (status === 'granted') {
  // 可以打开相机
}
```

---

## requestCameraPermission

发起相机权限请求（必要时弹系统授权框），返回请求后的状态。若用户已永久拒绝（`blocked`），需引导去系统设置开启。

### 签名

```ts
function requestCameraPermission(): Promise<CameraPermissionStatus>
```

### 返回值

`Promise<CameraPermissionStatus>` — 请求后的权限状态（同 `getCameraPermissionStatus`）。

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

---

## 平台兼容性

| 函数 | iOS | Android | Web |
| --- | --- | --- | --- |
| `decodeImage` | ✅ | ✅ | ❌ |
| `getCameraPermissionStatus` | ✅ | ✅ | ❌ |
| `requestCameraPermission` | ✅ | ✅ | ❌ |

---

## 相关

- [API 参考 → 类型](/docs/api/types) — `ScanResult` / `DecodeImageOptions` / `CameraPermissionStatus` / `HmsScanError`
- [指南 → 图片识别](/docs/guides/decode-image) — `decodeImage` 使用场景
- [指南 → 权限处理](/docs/guides/permissions) — 完整权限管理流程
