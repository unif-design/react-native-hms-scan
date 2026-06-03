---
sidebar_position: 8
title: 常见问题
description: "@unif/react-native-hms-scan 排障决策树（症状→因→解）：iOS 模拟器链接错误（预期，须真机）、ScanKitFrameWork LICENSE 警告无害、Android minSdk<24 / 缺 CAMERA、decodeImage 空数组非错误 / 不下载远程、iOS 手电 best-effort（onTorchStatus.available iOS 永不上报）。"
---

# 常见问题

按**症状 → 原因 → 解法**排查。多数问题集中在「iOS 在模拟器上跑」「Android minSdk / 权限」「把 `decodeImage` 空数组当错误」三类。

---

## 症状:iOS 模拟器编译 / 链接报错

```
ld: building for 'iOS-simulator', but linking in object file built for 'iOS'
```

✅ **这是预期行为,不是 bug —— 请用真机调试。**

`ScanKitFrameWork` 是华为老式 framework。podspec 的 `prepare_command` 已用 Apple 官方 `vtool` 补出 arm64 模拟器切片让模拟器**能编译**,但相机扫码能力**只能在真机上跑**。在 Apple 芯片模拟器上见到上面这行,切真机即可。

:::tip 在 CI / 模拟器里测逻辑
不要在模拟器里测真实扫码。单元测试用[测试(Mock)](/docs/testing)页的 `jest.mock` 方案,在无硬件环境跑通扫码 / 识图流程逻辑。
:::

---

## 症状:`pod install` 报 `ScanKitFrameWork` LICENSE 警告

```
[!] The `ScanKitFrameWork` pod ... has a license ... which doesn't provide any official binaries...
```

✅ **无害,可忽略。** 这是 CocoaPods 对部分非标准 / 私有 LICENSE 的提示,不影响编译和运行。

---

## 症状:Android 编译报错 `minSdkVersion < 24`

```
uses-sdk:minSdkVersion 21 cannot be smaller than version 24 declared in library
```

✅ 本库要求 **minSdkVersion ≥ 24**(Android 7.0)。在宿主 `android/build.gradle` 提升:

```gradle title="android/build.gradle"
buildscript {
  ext {
    minSdkVersion = 24
  }
}
```

---

## 症状:Android 扫码无响应 / 画面黑屏

逐一排查:

### 因 1:缺 `CAMERA` 权限声明

✅ 确认 `AndroidManifest.xml` 有 `android.permission.CAMERA`。本库清单已声明该权限并自动合并;若宿主合并策略覆盖了它,显式补回。见[安装 → 权限声明](/docs/getting-started/installation#android-permissions)。

### 因 2:运行时未授权相机

✅ `CAMERA` 是运行时权限,声明之外还要在运行时请求。用 `<Scanner>` 会自动处理;用 `<HmsScanView>` 时自己先调 `requestCameraPermission`。见[权限处理](/docs/guides/permissions)。

:::note 无需 agconnect / API Key
华为 Maven 源与 `scanplus` 依赖已内置在本库 gradle 里,Android **零配置**;**不需要** `agconnect-services.json` / AppGallery Connect 插件 / API Key。若你在为「漏配 agconnect」排查 —— 不必,本库不依赖它。
:::

---

## 症状:`decodeImage` 返回空数组 `[]`

✅ **空数组是正常结果,不是错误,也不会抛异常。** 可能原因:

1. **图里确实没码** —— 图片内容不含有效条码 / 二维码,返回 `[]` 完全正常。**别把 `!results.length` 当失败抛异常。**
2. **传了远程 URL** —— `decodeImage` **不下载网络图**;远程 URL 实际会抛 `E_IMAGE_LOAD_FAILED`,而非返回空数组。请宿主先下到本地再传。
3. **传了不支持的 uri** —— iOS 不接受 `ph://`(相册 URI)、`content://`;两端都不接受 `http(s)://`。用 `file://` / 绝对路径最稳。
4. **码制被 `formats` 限掉** —— 若传了 `formats`,确认目标码制在列表里。

详见[图片识别](/docs/guides/decode-image)。

---

## 症状:`decodeImage` 抛 `E_NO_READ_PERMISSION`

✅ 读相册图片需要权限(Android):`READ_MEDIA_IMAGES`(API 33+)/ `READ_EXTERNAL_STORAGE`(API ≤ 32)。本库清单已声明,但仍需**在运行时请求**后再调 `decodeImage`。

> iOS 端 `decodeImage` 不直接读相册(只收 `file://` / 绝对路径 / `data:`),相册读取由宿主图片选择器负责。见[权限处理 → decodeImage 的相册读取权限](/docs/guides/permissions#decode-image-permission)。

---

## 症状:手电筒在 iOS 上不生效 / 暗光提示不来

✅ **这是已知限制,不是 bug。** iOS 端 HMS 无公开手电 API,本库走 `AVCaptureDevice` **尽力而为**:

- `torch={true}` **不保证**点亮(设备 / 系统差异)。
- `onTorchStatus.available`(暗光提示)**仅 Android 上报,iOS 永不上报** —— 别把它当跨平台的暗光信号。

建议 iOS 上把手电按钮以「提示」而非「保证」呈现,或在 `<Scanner>` 上用 `showTorch={false}` 直接隐藏。详见[平台差异 → 手电筒](/docs/platform-differences#手电筒)。

---

## 症状:相机权限为 `blocked`,无法再弹授权框

✅ 用户已**永久拒绝**,系统不再允许弹框。引导去系统设置手动开启:

```ts
import { Linking } from 'react-native';
Linking.openSettings();
```

`<Scanner>` 在无权限时会自动展示引导去设置的遮罩。Android 上 `blocked` 的精确判断发生在 `requestCameraPermission` 之后,见[权限处理](/docs/guides/permissions#get-status)。

---

## 症状:打包 / 运行报 `Unable to resolve module ...`

✅ 缺同伴包。`peerDependencies` **缺一即崩**,逐项核对[安装 → 安装依赖](/docs/getting-started/installation#安装依赖)是否装齐 —— 尤其 `@unif/react-native-design` 及其链上的 `@gorhom/bottom-sheet` / `react-native-reanimated` / `react-native-gesture-handler` 等(`<Scanner>` 的 UI 依赖它们)。补齐后 iOS 重新 `cd ios && bundle exec pod install`。
