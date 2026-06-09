---
sidebar_position: 1
title: 安装
description: "安装 @unif/react-native-hms-scan 及全部必装 peerDependencies（含 @unif/react-native-design 与其 UI 依赖），Android 零配置（华为 Maven 内置、无 agconnect、minSdk≥24），iOS pod install + NSCameraUsageDescription。仅支持新架构。"
---

# 安装

装齐 `@unif/react-native-hms-scan` 的全部同伴包,配置原生权限,完成编译。**peerDeps 缺一即崩** —— 本页以 `package.json` 的 `peerDependencies` 为准逐项列出。

## 环境要求

| 要求 | 版本 |
| --- | --- |
| React Native | **新架构(Fabric + TurboModules)必须开启** |
| React | 19+ |
| Android | **minSdkVersion ≥ 24**(Android 7.0) |
| iOS | 随宿主 RN 工程最低版本(扫码相机**仅真机**) |

:::danger 仅支持新架构
本库是 Fabric 组件 + TurboModule 桥,**仅支持新架构**。旧架构(Bridge)不受支持。安装前确认宿主已启用新架构(`android/gradle.properties` 的 `newArchEnabled=true` 等)。
:::

---

## 1. 安装依赖 {#安装依赖}

以下同伴包**全部必装,缺一即崩**(以 `package.json` 的 `peerDependencies` 为准):

```sh
yarn add @unif/react-native-hms-scan \
  @unif/react-native-design react-native-svg \
  @sbaiahmed1/react-native-blur \
  react-native-gesture-handler react-native-reanimated \
  react-native-reanimated-carousel react-native-safe-area-context \
  react-native-worklets
```

各包的作用与版本约束:

| 包 | 版本约束 | 作用 |
| --- | --- | --- |
| `@unif/react-native-design` | `>=0.8.0` | `<Scanner>` 的主题、取景框、工具栏、结果卡、`toast` 全用它绘制 |
| `react-native-svg` | `>=15` | `<Scanner>` 图标 |
| `@sbaiahmed1/react-native-blur` | `>=4` | design 界面毛玻璃 |
| `react-native-gesture-handler` | `>=2.21.0` | design / 手势 |
| `react-native-reanimated` | `>=4.0.0` | design 动画 |
| `react-native-reanimated-carousel` | `>=5.0.0-beta.0` | design 组件依赖 |
| `react-native-safe-area-context` | `>=5.0.0` | 安全区适配 |
| `react-native-worklets` | `*` | reanimated 4 的 worklet 运行时 |

:::note 为什么扫码库要装这么多 UI 包
这些 peerDeps 几乎都是**成品 `<Scanner>`** 间接需要的:`<Scanner>` 的取景框 / 工具栏 / 结果卡 / `toast` 全部复用 [`@unif/react-native-design`](https://www.npmjs.com/package/@unif/react-native-design),而 design 自身依赖 `react-native-reanimated` / `react-native-gesture-handler` 等。即便你只用 headless `<HmsScanView>` 或 `decodeImage`,这些仍是声明的 peer —— 装齐即可,通常项目里已有大半。
:::

---

## 2. Android 配置

### 零配置:华为 Maven 与依赖已内置 {#android-zero-config}

:::tip 无需改宿主 gradle、无需 agconnect
华为 Maven 仓库(`https://developer.huawei.com/repo/`)与 `com.huawei.hms:scanplus` 依赖**已写在本库自己的 `android/build.gradle` 里**,宿主**不用改任何 gradle**。也**不需要** `agconnect-services.json` / AppGallery Connect 插件 / API Key —— Scan SDK-Plus 是内置引擎,非华为机型也能用。
:::

唯一硬要求是 **minSdkVersion ≥ 24**。若宿主低于 24,在 `android/build.gradle` 提升:

```gradle title="android/build.gradle"
buildscript {
  ext {
    minSdkVersion = 24  // 本库要求 ≥ 24（Android 7.0）
  }
}
```

### 权限声明 {#android-permissions}

本库的 `AndroidManifest.xml` **已声明** `CAMERA`、`READ_MEDIA_IMAGES`、`READ_EXTERNAL_STORAGE`(`maxSdkVersion="32"`)以及 `android.hardware.camera`(`required="false"`),它们会通过 manifest 合并自动并入宿主 App。**通常无需在宿主重复声明。**

若宿主的清单合并策略覆盖了它们,或你想显式声明,可在 `android/app/src/main/AndroidManifest.xml` 的 `<manifest>` 节点下补:

| 权限 | 说明 |
| --- | --- |
| `android.permission.CAMERA` | 相机扫码所需权限 |
| `android.permission.READ_MEDIA_IMAGES` | API 33+ 读相册图(**仅 `decodeImage` 解相册图时**需要) |
| `android.permission.READ_EXTERNAL_STORAGE` | `maxSdkVersion="32"`,API ≤ 32 读相册图(**仅 `decodeImage` 时**) |

```xml title="android/app/src/main/AndroidManifest.xml"
<uses-permission android:name="android.permission.CAMERA" />
<!-- 以下仅当用 decodeImage 解相册图时需要 -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />
```

> `CAMERA` / 相册读取属**运行时权限**,声明之外还要在运行时请求。`<Scanner>` 已自动处理相机权限;用 `<HmsScanView>` / `decodeImage` 时自行请求,见[权限处理](/docs/guides/permissions)。

---

## 3. iOS 配置

### pod install {#ios-pod-install}

```sh
cd ios && bundle exec pod install
```

`pod install` 会自动集成华为 `ScanKitFrameWork`(podspec 的 `prepare_command` 用 Apple 官方 `vtool` 把真机 arm64 切片改写补出 arm64 模拟器切片,打成 xcframework),**无需额外配置**,同样**不需要 AppGallery Connect / API Key**。

:::warning iOS 扫码仅真机
`ScanKitFrameWork` 是华为老式 framework。podspec 已补出 arm64 模拟器切片让模拟器**能编译**,但相机扫码**只能在真机上跑**。在 Apple 芯片模拟器上若见 `ld: building for 'iOS-simulator', but linking in object file built for 'iOS'`,**是预期**,切真机即可。`pod install` 输出的 `ScanKitFrameWork` LICENSE 警告**无害**。详见[常见问题](/docs/troubleshooting)。
:::

### Info.plist 权限 {#ios-permissions}

在宿主 `ios/<AppName>/Info.plist` 中添加:

| Key | 说明 |
| --- | --- |
| `NSCameraUsageDescription` | 相机使用说明(**必须**,展示给用户的文案) |
| `NSPhotoLibraryUsageDescription` | **仅当**宿主自己的图片选择器需要读相册时(本库 `decodeImage` 不直接读相册,见下) |

```xml title="ios/<AppName>/Info.plist"
<key>NSCameraUsageDescription</key>
<string>用于扫描商品条码与门店二维码</string>
<!-- 仅当宿主图片选择器需要访问相册时 -->
<key>NSPhotoLibraryUsageDescription</key>
<string>用于从相册选取图片识别条码</string>
```

:::note iOS 上 decodeImage 与相册权限
本库 iOS 端的 `decodeImage` 只接受 `file://` / 绝对路径 / `data:`,**不直接读相册 URI(`ph://`)**。从相册选图通常由宿主的图片选择器(如 `react-native-image-picker`)完成 —— 是**那个库**决定是否需要 `NSPhotoLibraryUsageDescription`,选完图它给你一个本地路径再传给 `decodeImage`。详见[图片识别](/docs/guides/decode-image)。
:::

---

## 4. 最小示例

安装完成后,参阅[快速上手](/docs/getting-started/quick-start)用 `<Scanner>` 跑通第一个扫码页。

---

## 下一步

- [快速上手](/docs/getting-started/quick-start) —— 5 分钟跑通第一个扫码页
- [指南 → 成品扫一扫页](/docs/guides/scanner) —— `<Scanner>` 完整使用说明
- [API 参考 → Scanner](/docs/api/scanner) —— Scanner 完整 props 文档
