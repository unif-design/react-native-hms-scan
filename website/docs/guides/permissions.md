---
sidebar_position: 4
title: 权限处理
description: 查询与请求相机权限——getCameraPermissionStatus、requestCameraPermission、拒权降级处理。
---

# 权限处理

本库提供两个权限工具函数，用于查询和请求相机权限。

:::info Scanner 自动处理权限
如果使用 `<Scanner>`，权限流程已在内部自动处理（挂载时请求，永久拒绝时展示引导遮罩）。本页内容适用于使用 `<HmsScanView>` 或 `decodeImage` 时自行管理权限的场景。
:::

---

## 查询权限状态

```tsx
import { getCameraPermissionStatus } from '@unif/react-native-hms-scan';

const status = await getCameraPermissionStatus();
// 'granted' | 'denied' | 'blocked' | 'undetermined'
```

- **`granted`** — 已授权，可直接使用相机
- **`denied`** — 用户本次拒绝（可再次请求）
- **`blocked`** — 用户永久拒绝（必须引导去系统设置开启）
- **`undetermined`** — 尚未请求过权限

---

## 请求权限

```tsx
import { requestCameraPermission } from '@unif/react-native-hms-scan';

const status = await requestCameraPermission();
if (status === 'granted') {
  // 权限已获取，可以打开相机
} else if (status === 'blocked') {
  // 用户永久拒绝，引导去系统设置
  Linking.openSettings();
}
```

---

## 拒权降级处理

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
    // 引导用户去系统设置手动开启
    Linking.openSettings();
  }

  return false;
}
```

---

## 相关

- [API 参考 → 函数](/docs/api/functions) — `getCameraPermissionStatus` / `requestCameraPermission` 完整签名
- [API 参考 → 类型](/docs/api/types) — `CameraPermissionStatus` 类型定义
