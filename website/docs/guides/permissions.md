---
sidebar_position: 4
title: 权限处理
description: "相机权限：<Scanner> 自动处理；headless <HmsScanView> 用 requestCameraPermission / getCameraPermissionStatus 自管。decodeImage 不申请相册权限，文件访问由宿主 picker / URI grant 负责。"
---

# 权限处理

扫码用相机,需要相机权限;本库提供两个权限工具函数供手动管理。`decodeImage` 不申请相册权限,所选图片能否读取由宿主 picker / URI grant 决定。

:::info `<Scanner>` 的权限恢复与错误边界
`<Scanner>` 自动请求权限：未获授权进入 `denied` 设置遮罩；用户从系统设置返回 App 后会自动重新查询。权限 helper reject 会进入可重试的 `error`,并由 `onScanError` 上报普通 `{ code, message }`（不是 `HmsScanError`）。相机 view 的 `E_NO_RESULT` 是 soft error，只上报、不离开扫码态；`E_CAMERA_INIT` 等其他 fatal error 同样进入 `error`。
:::

---

## 原生权限声明 {#native-declarations}

运行时请求之前,先确保原生权限键已声明(详见[安装](/docs/getting-started/installation)):

| 平台 | 权限 | 何时需要 |
| --- | --- | --- |
| iOS | `NSCameraUsageDescription` | 相机扫码(必须) |
| Android | `android.permission.CAMERA` | 相机扫码(库清单已声明,通常自动合并) |

> Android 的 `CAMERA` 已在本库 `AndroidManifest.xml` 声明并通过清单合并进入宿主,运行时请求仍需处理。当前清单虽保留图片读取兼容声明,但 `decodeImage` 不请求 / 检查它们,也不会产生 `E_NO_READ_PERMISSION`。

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

:::note 类型是四态,但没有哪个平台会产出全部四种
`CameraPermissionStatus` 的四个值是两端的并集,单个平台只产出其中一部分:

- **iOS** —— 只可能是 `granted`(`authorized`)、`undetermined`(`notDetermined`)、`blocked`。原生把 `denied` 与 `restricted` **都映射为 `blocked`**,所以 iOS **永远不会返回 `denied`**;别写「iOS 先 `denied` 再 `blocked`」的两级降级分支。
- **Android** —— 查询时无法可靠区分「永久拒绝」与「从未请求」(两种情况 `shouldShowRequestPermissionRationale` 都是 `false`),因此 `getCameraPermissionStatus` 对任何未授权状态一律返回 `denied`,不返回 `undetermined`;只有 `requestCameraPermission` 请求之后才可能返回 `blocked`。

判 `blocked` 时:Android 以请求后的返回为准,不要从查询结果推断;iOS 查询即可判定。
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

Android 没有当前 `PermissionAwareActivity` 时会 reject `E_NO_ACTIVITY`,不是返回 status。调用权限 API 时仍需 `try/catch`;不要把 reject 当作 `denied` 或 `blocked`。

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

> 这是 headless 场景的推荐主流程;生产代码还应 catch helper reject。`<Scanner>` 已把 helper reject 收敛为可重试的 `error`，无需借由它实现 headless 权限流。

---

## decodeImage 的文件访问边界 {#decode-image-permission}

`decodeImage` **不负责申请相册权限**,当前 native 也不会产生 `E_NO_READ_PERMISSION`。宿主图片选择器负责取得用户授权,并交付当前进程可读取的 URI:

- **Android** —— 优先传 picker 返回且带临时 read grant 的 `content://`;若稍后再解码,由宿主持久化 grant 或复制到 App 自有目录。也支持 `file://`、绝对路径与 `android.resource://`,不支持 `data:`。
- **iOS** —— 本库只接受 `file://` / 绝对路径 / `data:`,不接受 `ph://`;图片选择器是否需要 `NSPhotoLibraryUsageDescription` 由那个库的接入方式决定。

```ts
const localUri = await pickImage(); // picker 负责授权并返回可读 URI
if (localUri) {
  const results = await decodeImage(localUri);
}
```

详见[图片识别](/docs/guides/decode-image)。

---

## 相关

- [API 参考 → 函数](/docs/api/functions) —— `getCameraPermissionStatus` / `requestCameraPermission` 完整签名
- [API 参考 → 类型](/docs/api/types) —— `CameraPermissionStatus` 类型定义
- [指南 → 图片识别](/docs/guides/decode-image) —— `decodeImage` URI 与错误语义
