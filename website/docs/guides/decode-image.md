---
sidebar_position: 3
title: 图片识别
description: "decodeImage(localUri) 从本地图片解码条码/二维码：file:// / 绝对路径两端通用，content:// / android.resource:// 仅 Android，data: 仅 iOS；空数组是正常结果。"
---

# 图片识别

`decodeImage(uri, options?)` 从一张**本地**图片解码条码 / 二维码,返回命中的结果数组(可能为空)。它**不走相机**,是独立的识图路径。

```tsx
import { decodeImage } from '@unif/react-native-hms-scan';

const results = await decodeImage('file:///path/to/photo.jpg');
if (results.length > 0) {
  const code = results[0].value;
  // 处理识别结果 ...
} else {
  // 空数组 = 图里没有码（正常，不是错误）
}
```

---

## 限定码制 {#formats}

传 `formats` 限定识别哪些码制,**不传 = 识别全部 14 种**:

```tsx
const results = await decodeImage('file:///path/photo.jpg', {
  formats: ['QR_CODE', 'EAN_13'],
});
```

---

## 接受的 URI:本地路径,不下载远程 {#accepted-uri}

`decodeImage` 只接受**本地** uri。两端接受的形式略有差异(源自各自原生实现):

| 形式 | Android | iOS |
| --- | --- | --- |
| `file:///...`(文件 URI) | ✅ | ✅ |
| 绝对路径(无 scheme,如 `/data/.../a.jpg`) | ✅ | ✅ |
| `content://...`(Android Content URI) | ✅ | ❌ |
| `android.resource://...` | ✅ | ❌ |
| `data:...`(base64 等) | ❌ | ✅ |
| `ph://...`(iOS Photos)/ `assets-library://` | ❌ | ❌ |
| `http(s)://...`(远程 URL) | ❌ | ❌ |

:::tip 跨平台安全输入:`file://` 或绝对路径
要两端都稳的输入,用 **`file://` 或绝对路径**。`content://` **仅 Android**;iOS **不接受 `ph://`**(相册 URI)。从相册选图时,让你的图片选择器(如 `react-native-image-picker`)返回**本地文件路径**(它通常已落地为 `file://` / 路径)再传给 `decodeImage`,跨平台最省心。
:::

:::warning 不下载远程 URL
`decodeImage` **不会下载远程 URL**(`http(s)://` 两端都不支持)。如需识别网络图片,请宿主**先下载到本地**,再把本地 uri 传进来。
:::

```ts
// ❌ Incorrect：传远程 URL，decodeImage 不下载，解不出（会抛 E_IMAGE_LOAD_FAILED）
const results = await decodeImage('https://example.com/qr.png');

// ✅ Correct：先下到本地，再传本地 uri（file:// / 绝对路径）
const local = await downloadToLocal('https://example.com/qr.png');
const results = await decodeImage(local);
```

---

## 空数组是正常结果,不是错误 {#empty-array}

图里**没有检测到码**时,`decodeImage` resolve 一个**空数组 `[]`**,**不会抛错**。这是最容易踩的坑:

```ts
// ❌ Incorrect：把空数组当失败抛异常 —— 把"图里没码"误判成错误
const results = await decodeImage(localUri);
if (!results.length) throw new Error('decode failed'); // 错：[] 是正常结果

// ✅ Correct：空数组 = 图里没码（正常），据此提示即可
const results = await decodeImage(localUri);
if (results.length === 0) {
  // 图里没码，正常 —— 提示"未识别到条码"之类
} else {
  use(results[0].value);
}
```

---

## 错误处理:真正的失败才抛 `HmsScanError` {#error-handling}

只有**图片加载失败 / 解码异常**等真正的失败才抛 `HmsScanError`(带 `code`);其他原生异常统一收敛为 `E_UNKNOWN`:

```tsx
import { decodeImage, HmsScanError } from '@unif/react-native-hms-scan';

try {
  const results = await decodeImage(uri);
  // results 可能为空数组（图中无码）—— 不会走到 catch
} catch (e) {
  if (e instanceof HmsScanError) {
    switch (e.code) {
      case 'E_IMAGE_LOAD_FAILED':   /* 路径无效 / 非本地 uri / 格式不支持 */ break;
      case 'E_DECODE_FAILED':       /* 解码过程异常 */ break;
      default: /* E_UNKNOWN 等 */ break;
    }
  }
}
```

| 场景 | 结果 |
| --- | --- |
| 图里没码 | resolve `[]`(**不抛错**) |
| 传了远程 URL / 非本地 uri / 路径无效 | 抛 `E_IMAGE_LOAD_FAILED` |
| 解码过程异常 | 抛 `E_DECODE_FAILED` |
| 其他原生异常 | 抛 `E_UNKNOWN` |

:::note 相册权限由宿主 picker / URI grant 负责
当前 Android / iOS native 都不会产生 `E_NO_READ_PERMISSION`。Android `content://` 是否可读取决于宿主 picker 提供的临时 / 持久 URI grant;iOS 图片选择器需导出本库支持的 `file://` / 绝对路径 / `data:`。加载不到统一抛 `E_IMAGE_LOAD_FAILED`。
:::

完整错误码见 [API → HmsScanErrorCode](/docs/api/types)。

---

## 相关

- [API 参考 → 函数](/docs/api/functions) —— `decodeImage` 完整签名与错误码表
- [API 参考 → 类型](/docs/api/types) —— `ScanResult` / `HmsScanError` 类型定义
- [指南 → 权限处理](/docs/guides/permissions) —— 相机权限与图片 URI 访问边界
