---
sidebar_position: 8
title: 常见问题
description: "@unif/react-native-hms-scan 排障决策树：iOS 真机 / Simulator 支持边界、官方 ScanKitFrameWork CocoaPod、Huawei Maven / minSdk / CAMERA、decodeImage URI grant 与空数组、iOS 手电 best-effort。"
---

# 常见问题

按**症状 → 原因 → 解法**排查。多数问题集中在「iOS 目标选成 Simulator」「Android minSdk / 权限」「把 `decodeImage` 空数组当错误」三类。

---

## 症状:iOS Simulator 编译 / 链接报错

```
ld: building for 'iOS-simulator', but linking in object file built for 'iOS'
```

✅ **这是当前预期边界:iOS Simulator 不支持。** 按以下顺序处理:

1. 在 Xcode 或 React Native CLI 中选择物理 iPhone,不要继续以 Simulator 为构建目标。
2. 从宿主 `ios/` 执行 `bundle exec pod install`;CocoaPods 应安装官方 `ScanKitFrameWork 1.1.2.305`,不会在 `node_modules` 中生成 XCFramework。
3. 不要为支持 Simulator 清理 cache、生成本地 framework 或修改宿主 Podfile。
4. 若只需验证 JS 逻辑,使用随包 Jest mock。

真正的**真机构建**若报 `'ScanKitFrameWork/ScanKitFrameWork.h' file not found`,才属于集成故障。确认依赖已升级到包含本方案的版本,重新执行 `pod install`,并检查 `Podfile.lock` 精确包含 `ScanKitFrameWork (1.1.2.305)`。

:::tip 在无硬件环境测逻辑
单元测试用[测试(Mock)](/docs/testing)页的 `jest.mock` 方案验证扫码 / 识图流程的 JS 逻辑。mock 不会加载 iOS 原生模块,也不代表 Simulator 获得原生支持。
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

## 症状:Android 报 `Could not find com.huawei.hms:scanplus`

✅ 宿主没有把 Huawei Maven 加到实际参与 App 依赖解析的仓库列表。库虽然声明了 `scanplus`,但 library 自己的 `repositories` 不会传播给 consumer。在宿主 `allprojects.repositories` 或 `dependencyResolutionManagement.repositories` 中加入:

```gradle
maven { url 'https://developer.huawei.com/repo/' }
```

仍然**不需要** `agconnect-services.json`、AppGallery Connect 插件或 API Key。

---

## 症状:Android 扫码无响应 / 画面黑屏

逐一排查:

### 因 1:缺 `CAMERA` 权限声明

✅ 确认 `AndroidManifest.xml` 有 `android.permission.CAMERA`。本库清单已声明该权限并自动合并;若宿主合并策略覆盖了它,显式补回。见[安装 → 权限声明](/docs/getting-started/installation#android-permissions)。

### 因 2:运行时未授权相机

✅ `CAMERA` 是运行时权限,声明之外还要在运行时请求。用 `<Scanner>` 会自动处理;用 `<HmsScanView>` 时自己先调 `requestCameraPermission`。见[权限处理](/docs/guides/permissions)。

若 `requestCameraPermission()` 直接 reject `E_NO_ACTIVITY`,当前前台 Activity 不存在或不是 `PermissionAwareActivity`;先确认在可见 RN Activity 中调用。不要把该 reject 当作某个权限 status。另请注意 `<Scanner>` 当前对权限 helper reject 会 fail-open,严格权限门禁应采用 headless 流程自行兜底。

:::note 无需 agconnect / API Key
宿主必须添加 Huawei Maven,但**不需要** `agconnect-services.json`、AppGallery Connect 插件或 API Key。若你在为「漏配 agconnect」排查 —— 不必,本库不依赖它。
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

## 症状:从相册选图后 `decodeImage` 抛 `E_IMAGE_LOAD_FAILED`

✅ 先确认 picker 返回的 URI 形式受当前平台支持,并确认 URI grant 仍有效:

- Android 支持 `content://` 临时授权;若要延迟读取,由宿主持久化 grant 或复制到 App 自有目录。
- iOS 不支持 `ph://`;让 picker 导出 `file://` / 绝对路径,或由宿主读取后转成 `data:`。
- 当前 native **不会产生 `E_NO_READ_PERMISSION`**;加载不到图片统一是 `E_IMAGE_LOAD_FAILED`,相册授权与 URI 可读性由宿主 picker / URI grant 负责。

见[权限处理 → decodeImage 的文件访问边界](/docs/guides/permissions#decode-image-permission)。

---

## 症状:手电筒在 iOS 上不生效 / 暗光提示不来

✅ **这是已知限制,不是 bug。** iOS 端 HMS 无公开手电 API,本库走 `AVCaptureDevice` **尽力而为**:

- `torch={true}` **不保证**点亮(设备 / 系统差异)。
- iOS 会在 `torch` 初次应用和后续 prop 变更时上报 `onTorchStatus`;`available` 表示硬件是否有手电,`on` 表示真实点亮状态,**不是暗光提示**。只有 Android 的 `available` 来自暗光回调。

建议 iOS 上把手电按钮以「提示」而非「保证」呈现,或在 `<Scanner>` 上用 `showTorch={false}` 直接隐藏。详见[平台差异 → 手电筒](/docs/platform-differences#torch)。

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

✅ 缺同伴包。`peerDependencies` **缺一即崩**,逐项核对[安装 → 安装依赖](/docs/getting-started/installation#安装依赖)是否装齐 —— 尤其 `@unif/react-native-design` 及其链上的 `react-native-reanimated` / `react-native-gesture-handler` 等(`<Scanner>` 的 UI 依赖它们)。补齐后 iOS 重新 `cd ios && bundle exec pod install`。
