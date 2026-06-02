---
sidebar_position: 8
title: 常见问题
description: "@unif/react-native-hms-scan 在 iOS / Android / 功能域 / 权限场景下的已知问题与修复方法。"
---

# 常见问题

## iOS

### ❓ arm64 模拟器编译报错

```
ld: building for 'iOS-simulator', but linking in object file built for 'iOS'
```

✅ **预期行为，请用真机调试。** `ScanKitFrameWork` 是 arm64-only 静态库；podspec 已对 Apple 芯片模拟器排掉 arm64（模拟器走 x86_64），但真机 arm64 正常工作。建议直接在真机上调试扫码。

---

### ❓ pod install 报 LICENSE 警告

```
[!] The `ScanKitFrameWork` pod has a license... which doesn't provide any official binaries...
```

✅ **无害，可忽略。** 这是 CocoaPods 对部分私有 / 非标准 LICENSE 的提示，不影响编译和运行。

---

## Android

### ❓ 编译报错 `minSdkVersion < 24`

```
uses-sdk:minSdkVersion 21 cannot be smaller than version 24 declared in library
```

✅ 将宿主 `android/build.gradle` 或 `android/app/build.gradle` 的 `minSdkVersion` 提升到 `24`。

---

### ❓ 扫码无响应 / 画面黑屏

✅ 检查 `AndroidManifest.xml` 是否缺少 `CAMERA` 权限声明，参见[安装 → Android 配置](/docs/getting-started/installation#2-android-配置)。确认宿主已在运行时请求相机权限（使用 `requestCameraPermission` 或 `<Scanner>` 自动处理）。

---

## 功能域

### ❓ 手电筒在 iOS 上不生效

✅ **这是已知限制，不是 bug。** iOS 端 HMS 无公开手电 API，本库走 `AVCaptureDevice` 尽力而为，不保证稳定。详见[平台差异](/docs/platform-differences)。建议在 iOS 上将手电提示以"参考"而非"保证"的方式向用户呈现。

---

### ❓ decodeImage 返回空数组

✅ 可能原因：
1. **图中确实无码** — 图片内容不含有效条码 / 二维码，返回空数组是正常行为（不抛错）。
2. **远程 URI** — `decodeImage` 不下载网络图，请宿主先下载到本地再传入本地 URI。
3. **码制未覆盖** — 如果传了 `formats` 限定，确认目标码制在列表中。

---

## 权限

### ❓ 相机权限状态为 `blocked`，无法再次弹框

✅ 用户已永久拒绝，系统不再允许弹授权框。需引导用户去系统设置手动开启：

```ts
import { Linking } from 'react-native';
Linking.openSettings();
```

`<Scanner>` 会在无权限时自动展示引导去设置的遮罩。

---

### ❓ decodeImage 抛 `E_NO_READ_PERMISSION`

✅ 读取相册图片需要 `READ_MEDIA_IMAGES`（API 33+）/ `READ_EXTERNAL_STORAGE`（API ≤ 32）权限。检查 `AndroidManifest.xml` 是否已声明，并在运行时请求这两个权限后再调用 `decodeImage`。
