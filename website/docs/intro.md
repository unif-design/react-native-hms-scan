---
sidebar_position: 1
title: 介绍
description: "@unif/react-native-hms-scan — 华为 HMS 统一扫码服务的 React Native 封装，支持定制视图扫码与图片识别，新架构。"
---

# @unif/react-native-hms-scan

[![npm](https://img.shields.io/npm/v/@unif/react-native-hms-scan.svg?color=cb3837&logo=npm)](https://www.npmjs.com/package/@unif/react-native-hms-scan)
[![CI](https://github.com/unif-design/react-native-hms-scan/actions/workflows/ci.yml/badge.svg)](https://github.com/unif-design/react-native-hms-scan/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/@unif/react-native-hms-scan.svg?color=blue)](https://github.com/unif-design/react-native-hms-scan/blob/main/LICENSE)
[![Docs](https://img.shields.io/badge/docs-unif--design.github.io-orange.svg)](https://unif-design.github.io/react-native-hms-scan/)

华为 **HMS 统一扫码服务**（HUAWEI Scan Kit）的 React Native 封装，新架构（TurboModule + Fabric）。聚焦两件事：

- **定制视图扫码** — 底层 headless `<HmsScanView>` 相机组件，外加按设计稿做好的成品 `<Scanner>` 扫一扫页（聚焦款，浅色）。
- **图片识别** — `decodeImage(uri)` 从本地图片解码条码 / 二维码。

:::tip 卖点
- Android 使用 **Scan SDK-Plus**（内置引擎，**不依赖设备安装 HMS Core APK**，非华为机型可用）
- iOS 使用 CocoaPods 的 **ScanKitFrameWork**
- 两端**都不需要 AppGallery Connect / agconnect 配置 / API Key**
:::

## 平台支持

| 平台    | 支持 |
| ------- | ---- |
| iOS     | ✅ 真机 |
| Android | ✅   |
| Web     | ❌   |

:::warning 真机运行
扫码功能依赖原生相机，**无法在浏览器或模拟器中预览实际效果**。请在真机上验证完整行为。
:::

## 下一步

- [快速开始 → 安装](/docs/getting-started/installation)
- [快速开始 → 快速上手](/docs/getting-started/quick-start)
