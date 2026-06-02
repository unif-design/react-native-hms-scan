---
sidebar_position: 1
title: 安装
description: 安装 @unif/react-native-hms-scan，配置 Android / iOS 权限与原生依赖，完成原生编译。
---

# 安装

本页指导你从零完成 `@unif/react-native-hms-scan` 的安装、权限配置和原生编译。

## 环境要求

| 要求 | 说明 |
| --- | --- |
| React Native | **新架构（Fabric + TurboModules）必须开启** |
| Android | **minSdkVersion ≥ 24**（Android 7.0） |
| iOS | 随宿主 RN 工程最低版本 |

---

## 1. 安装依赖

```sh
yarn add @unif/react-native-hms-scan react-native-svg
cd ios && pod install
```

:::warning react-native-svg 是 peer 依赖
`react-native-svg` 是必装的同伴包，`<Scanner>` 的图标依赖它绘制，缺少会导致图标渲染失败。
:::

---

## 2. Android 配置

### Maven 与 Gradle

:::tip 无需改宿主 gradle
库的 gradle 已自带华为 maven 仓库与 `com.huawei.hms:scanplus` 依赖，**无需改宿主 gradle**。也**不需要** `agconnect-services.json` / agconnect 插件 / API Key。
:::

### 权限声明

在宿主 `android/app/src/main/AndroidManifest.xml` 的 `<manifest>` 节点下添加：

| 权限 | 说明 |
| --- | --- |
| `android.permission.CAMERA` | 相机扫码所需权限 |
| `android.hardware.camera`（feature） | `required="false"` 使非相机设备也可安装 |
| `android.permission.READ_MEDIA_IMAGES` | API 33+ 读取相册图片（仅 `decodeImage` 解相册图时需要） |
| `android.permission.READ_EXTERNAL_STORAGE` | `maxSdkVersion="32"` 读取相册图片（API ≤ 32，仅 `decodeImage` 需要） |

```xml title="android/app/src/main/AndroidManifest.xml"
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<!-- 仅当用 decodeImage 解相册图时需要 -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />
```

---

## 3. iOS 配置

### pod install

```sh
cd ios && bundle exec pod install
```

`pod install` 会自动拉取 `ScanKitFrameWork`，无需额外配置。

### Info.plist 权限

在宿主 `ios/<AppName>/Info.plist` 中添加：

| Key | 说明 |
| --- | --- |
| `NSCameraUsageDescription` | 相机使用说明（必须） |
| `NSPhotoLibraryUsageDescription` | 仅在使用 `decodeImage` 解相册图时需要 |

```xml title="ios/<AppName>/Info.plist"
<key>NSCameraUsageDescription</key>
<string>用于扫描商品条码与门店二维码</string>
<!-- 仅当用 decodeImage 解相册图时需要 -->
<key>NSPhotoLibraryUsageDescription</key>
<string>用于从相册选取图片识别条码</string>
```

:::danger ScanKitFrameWork 是 arm64-only 静态库
`ScanKitFrameWork` 仅含 arm64 切片：podspec 已对 Apple 芯片模拟器排掉 arm64（模拟器走 x86_64），**真机 arm64 不受影响**。建议在**真机**上调试扫码功能。
:::

---

## 4. 最小示例

安装完成后，参阅[快速上手](/docs/getting-started/quick-start)查看最小可运行示例。

---

## 下一步

- [快速上手](/docs/getting-started/quick-start) — 最小可运行示例
- [指南 → 成品扫一扫页](/docs/guides/scanner) — `<Scanner>` 完整使用说明
- [API 参考 → Scanner](/docs/api/scanner) — Scanner 完整 props 文档
