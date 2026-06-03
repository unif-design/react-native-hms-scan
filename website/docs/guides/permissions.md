---
sidebar_position: 4
title: 权限处理
description: "相机权限：<Scanner> 自动处理；headless <HmsScanView> 用 requestCameraPermission / getCameraPermissionStatus 自管（granted/denied/blocked/undetermined）。iOS 需 NSCameraUsageDescription，Android 需 CAMERA；decodeImage 解相册图另需 READ_MEDIA_IMAGES。"
---

# 权限处理

扫码用相机,需要相机权限;`decodeImage` 解相册图另需读相册权限。本库提供两个权限工具函数供手动管理。

:::info `<Scanner>` 自动处理相机权限
用 [`<Scanner>`](/docs/guides/scanner) 时,**相机权限已在内部自动处理**:挂载时请求,永久拒绝时展示引导去系统设置的遮罩。本页内容适用于用 [`<HmsScanView>`](/docs/guides/headless) 或 `decodeImage` 时**自行管理**权限的场景。
:::

---

## 原生权限声明 {#native-declarations}

运行时请求之前,先确保原生权限键已声明(详见[安装](/docs/getting-started/installation)):

| 平台 | 权限 | 何时需要 |
| --- | --- | --- |
| iOS | `NSCameraUsageDescription` | 相机扫码(必须) |
| Android | `android.permission.CAMERA` | 相机扫码(库清单已声明,通常自动合并) |
| Android | `READ_MEDIA_IMAGES`(API 33+)/ `READ_EXTERNAL_STORAGE`(≤32) | **仅 `decodeImage` 解相册图**(库清单已声明) |

> Android 端这些权限**已在本库 `AndroidManifest.xml` 里声明**,通过清单合并并入宿主。运行时请求仍需你做(下文)。

---

## 查询权限状态 `getCameraPermissionStatus` {#get-status}

```tsx
import { getCameraPermissionStatus } from '@unif/react-native-hms-scan';

const status = await getCameraPermissionStatus(); // 不弹窗,仅查询
// 'granted' | 'denied' | 'blocked' | 'undetermined'
```

- **`granted`** —— 已授权,可直接用相机
- **`denied`** —— 用户拒绝(可再次请求)
- **`blocked`** —— 用户永久拒绝(必须引导去系统设置开启)
- **`undetermined`** —— 尚未请求过权限

:::note Android 的状态区分发生在「请求后」
Android 在**查询时**无法可靠区分「永久拒绝」与「从未请求」,因此 `getCameraPermissionStatus` 对任何未授权状态都返回 **`denied`**;`blocked` / `undetermined` 的精确区分由 **`requestCameraPermission`**(请求后)给出。iOS 则查询时即可返回完整四态。所以**判断流程请以 `requestCameraPermission` 的返回为准**,别只靠查询结果去区分 `blocked`。
:::

---

## 请求权限 `requestCameraPermission` {#request}

```tsx
import { Linking } from 'react-native';
import { requestCameraPermission } from '@unif/react-native-hms-scan';

const status = await requestCameraPermission(); // 必要时弹系统授权框
if (status === 'granted') {
  // 权限已获取,可打开相机
} else if (status === 'blocked') {
  // 永久拒绝:引导去系统设置（系统不再弹框）
  Linking.openSettings();
}
```

---

## 拒权降级处理(推荐封装) {#fallback}

headless 场景进入扫码页前,先用这个模式确保权限:

```tsx
import { Linking } from 'react-native';
import {
  getCameraPermissionStatus,
  requestCameraPermission,
} from '@unif/react-native-hms-scan';

async function ensureCameraPermission(): Promise<boolean> {
  let status = await getCameraPermissionStatus();

  if (status === 'undetermined' || status === 'denied') {
    status = await requestCameraPermission();
  }

  if (status === 'granted') return true;

  if (status === 'blocked') {
    Linking.openSettings(); // 永久拒绝,只能去系统设置
  }
  return false;
}
```

> 这正是 `<Scanner>` 内部的权限流;用 `<Scanner>` 时无需自己写。

---

## decodeImage 的相册读取权限 {#decode-image-permission}

`decodeImage` 解相册图时需要读相册权限:

- **Android** —— `READ_MEDIA_IMAGES`(API 33+)/ `READ_EXTERNAL_STORAGE`(≤32)。缺权限时 `decodeImage` 抛 `HmsScanError`,`code` 为 `E_NO_READ_PERMISSION`。
- **iOS** —— 本库 `decodeImage` 只接受 `file://` / 绝对路径 / `data:`,**不直接读相册 URI(`ph://`)**;读相册由宿主的图片选择器负责,是**那个库**申请 `NSPhotoLibraryUsageDescription`。

```ts
import { decodeImage, HmsScanError } from '@unif/react-native-hms-scan';

try {
  const results = await decodeImage(localUri);
} catch (e) {
  if (e instanceof HmsScanError && e.code === 'E_NO_READ_PERMISSION') {
    // 引导授予相册读取权限（Android）
  }
}
```

详见[图片识别](/docs/guides/decode-image)。

---

## 相关

- [API 参考 → 函数](/docs/api/functions) —— `getCameraPermissionStatus` / `requestCameraPermission` 完整签名
- [API 参考 → 类型](/docs/api/types) —— `CameraPermissionStatus` 类型定义
- [指南 → 图片识别](/docs/guides/decode-image) —— `decodeImage` 与相册读取权限
