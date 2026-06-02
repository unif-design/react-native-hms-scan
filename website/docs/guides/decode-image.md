---
sidebar_position: 3
title: 图片识别
description: 使用 decodeImage 从本地图片解码条码 / 二维码——参数、返回值、错误处理。
---

# 图片识别

`decodeImage` 从本地图片解码条码 / 二维码，返回命中的结果数组。

---

## 基本用法

```tsx
import { decodeImage } from '@unif/react-native-hms-scan';

const results = await decodeImage('file:///path/to/photo.jpg');
if (results.length > 0) {
  const code = results[0].value;
  // 处理识别结果 ...
}
```

---

## 限定码制

传入 `formats` 选项可限定识别哪些码制，不传则识别全部：

```tsx
const results = await decodeImage('file:///path/photo.jpg', {
  formats: ['QR_CODE', 'EAN_13'],
});
```

---

## 支持的 URI 格式

`decodeImage` 只接受**本地 URI**：

- `file:///...` — 文件路径
- `content://...` — Android Content URI
- `ph://...` — iOS Photos URI
- 绝对路径（无 scheme 前缀）

:::warning 不下载远程图片
`decodeImage` **不会下载远程 URL**。如需识别网络图片，请宿主先下载到本地再传入本地 URI。
:::

---

## 错误处理

```tsx
import { decodeImage, HmsScanError } from '@unif/react-native-hms-scan';

try {
  const results = await decodeImage(uri);
  // results 可能为空数组（图中无码）
} catch (e) {
  if (e instanceof HmsScanError) {
    // e.code: HmsScanErrorCode
    // e.message: 说明
    if (e.code === 'E_NO_READ_PERMISSION') {
      // 引导用户授予相册读取权限
    } else if (e.code === 'E_IMAGE_LOAD_FAILED') {
      // 图片路径无效或格式不支持
    }
  }
}
```

结果为**空数组**（`[]`）表示图中未检测到码，不会抛错。

---

## 相关

- [API 参考 → 函数](/docs/api/functions) — `decodeImage` 完整签名与错误码表
- [API 参考 → 类型](/docs/api/types) — `ScanResult` / `HmsScanError` 类型定义
- [指南 → 权限](/docs/guides/permissions) — 相册读取权限处理
