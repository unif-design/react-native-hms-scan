---
sidebar_position: 1
title: 介绍
description: "@unif/react-native-hms-scan 是华为 HMS Scan Kit 的 React Native 新架构封装：Android 用内置引擎 Scan SDK-Plus（非华为机也能用、无需 agconnect），iOS 用官方 ScanKitFrameWork 1.1.2.305 CocoaPod 且仅支持真机。三种用法：成品 <Scanner> 页 / headless <HmsScanView> / decodeImage 图片识别。"
---

# @unif/react-native-hms-scan

华为 **HMS 统一扫码服务**（HUAWEI Scan Kit）的 **React Native 新架构封装**：丢一个成品 `<Scanner>` 进路由就有完整扫一扫页,或用底层 `<HmsScanView>` 自绘 UI,或用 `decodeImage(uri)` 从一张本地图里解出条码 / 二维码。

[![npm](https://img.shields.io/npm/v/@unif/react-native-hms-scan.svg?color=cb3837&logo=npm)](https://www.npmjs.com/package/@unif/react-native-hms-scan)
[![CI](https://github.com/unif-design/react-native-hms-scan/actions/workflows/ci.yml/badge.svg)](https://github.com/unif-design/react-native-hms-scan/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/@unif/react-native-hms-scan.svg?color=blue)](https://github.com/unif-design/react-native-hms-scan/blob/main/LICENSE)
[![Docs](https://img.shields.io/badge/docs-unif--design.github.io-orange.svg)](https://unif-design.github.io/react-native-hms-scan/)

## 这个库是什么

它在华为 Scan Kit 之上,封装出一套**新架构(Fabric + TurboModule)友好、UI 文案中文**的 React Native 扫码接口,把相机预览、码制识别、权限流、结果回调都收敛好,对外只暴露三个用法:

- **成品 `<Scanner>` 页** —— 开箱即用的「扫一扫」整屏界面(聚焦款,浅色),取景框 / 工具栏 / 结果卡都用 [`@unif/react-native-design`](https://www.npmjs.com/package/@unif/react-native-design) 的主题令牌绘制,权限流自动处理。
- **底层 `<HmsScanView>`** —— headless 相机组件,只出相机预览 + 抛扫码事件,取景框 / 手电按钮等 UI 由你用普通 RN 视图自己叠加。
- **`decodeImage(uri)`** —— 从一张**本地**图片解码,不走相机,返回命中的结果数组。

## 解决什么问题

直接接华为原生 Scan Kit,你要分别处理 iOS / Android 的相机视图接入、码制枚举的两端映射、运行时权限、暗光手电、图片识别的 Bitmap 路径。本库把这些收敛成声明式调用:

```tsx
import { Scanner } from '@unif/react-native-hms-scan';

// 一个组件就是完整的「扫一扫」页:取景 → 识别 → 确定带回
<Scanner
  title="扫一扫"
  onClose={() => navigation.goBack()}
  onConfirm={(product, result) => navigation.navigate('Order', { barcode: result.value })}
/>
```

## 核心概念

- **三种用法分层** —— `<Scanner>`(整屏直接用)内部用 `<HmsScanView>`(headless,自定义 UI 用它),两者底层都过同一套原生 TurboModule / Fabric 组件;`decodeImage` 是**独立的图片识别路径,不走相机**。需求由轻到重对应:成品页 → 自绘 UI → 仅识图。
- **Android 用内置引擎,非华为机也能用** —— Android 端走 **Scan SDK-Plus**(`com.huawei.hms:scanplus`),识别引擎**内置在库里**,**不依赖设备安装 HMS Core APK**,普通非华为机型也能扫。`scanplus` 依赖由本库声明;由于库模块的仓库声明不会传播给 consumer,宿主必须把 Huawei Maven 加到实际参与解析的 `repositories`。**不需要 AppGallery Connect / `agconnect-services.json` / API Key**。
- **iOS 用官方 CocoaPod,仅真机** —— CocoaPods 安装华为官方 `ScanKitFrameWork 1.1.2.305`(自包含,同样无需 AppGallery Connect / API Key)。`pod install` 不会在 `node_modules` 中生成 XCFramework;iOS 原生构建和运行都只支持真机。
- **码制两端归一** —— 原生侧(Android `HmsScan.*` / iOS `HMSScanFormatTypeCode`)已统一映射成 14 种字符串码制枚举再回 JS;`formats` **省略 = 识别全部码制**。
- **`decodeImage` 空数组是正常结果** —— 图里没有码时返回**空数组 `[]`,不是错误、不会 throw**;图片加载失败 / 解码异常才抛 `HmsScanError`,其他原生异常统一收敛为 `E_UNKNOWN`。

## 能力

- **成品「扫一扫」页** —— `<Scanner>` 自带状态机 + 权限流 + 主题,一次扫一个,扫到后弹浮层确认卡,确定带回上一级。
- **headless 自定义扫码** —— `<HmsScanView>` 只出预览 + 抛事件,UI 完全自绘;支持 `formats` / `paused` / `continuous` / `torch`。
- **图片识别** —— `decodeImage(localUri)` 从本地图片解码,可限定码制。
- **相机权限工具** —— `getCameraPermissionStatus` / `requestCameraPermission`,返回归一化状态;四个取值是两端并集,单平台只产出其中一部分(iOS 无 `denied`)。
- **14 种码制** —— 二维码与一维码全覆盖,省略 `formats` 即识别全部。
- **官方 Jest mock** —— 随包导出 `./mock`,测试里整包替换,无需手写桩。

## 何时使用

| 适用 | 不适用 |
| --- | --- |
| 扫二维码 / 条码(商品条码、门店码、付款码等) | 拍照 / 录像 —— 用 [`@unif/react-native-camera`](https://www.npmjs.com/package/@unif/react-native-camera) |
| 想要一套现成的中文扫一扫页 UI(`<Scanner>`) | —— |
| 完全自定义的扫码界面(`<HmsScanView>` 自绘) | 需要内置图片选择器(本库不内置,由宿主提供) |
| 从**本地**图片识别条码 / 二维码(`decodeImage`) | 识别**远程 URL** 图片 —— 本库不下载,需宿主先下到本地 |

## 平台支持

| 平台 | 支持 |
| --- | --- |
| iOS | ✅ 官方 CocoaPod + 真机 |
| iOS Simulator | ❌ 不支持 |
| Android（API 24+) | ✅ |
| Android emulator | ⚠️ 可运行非相机逻辑;真实扫码请用真机 |
| Web | ❌ |

:::warning iOS 原生目标仅支持真机
iOS 相机扫码与 `decodeImage` 原生路径都必须在真机上构建和验证。iOS Simulator 不支持;无硬件环境中的 JS 逻辑使用随包 Jest mock,不能把 mock 结果视为 Simulator 原生支持。
:::

:::info 仅支持新架构
本库是 Fabric 组件 + TurboModule 桥,**仅支持 React Native 新架构**。旧架构(Bridge)不在目标范围。Android 还要求 **minSdkVersion ≥ 24**(Android 7.0)。
:::

## 下一步

- [安装](/docs/getting-started/installation) —— 装 peerDeps、配置 Android Huawei Maven、执行 iOS `pod install` 并添加权限键
- [快速上手](/docs/getting-started/quick-start) —— 5 分钟用 `<Scanner>` 跑通第一个扫码页
- [指南 → 成品扫一扫页](/docs/guides/scanner) —— `<Scanner>` 完整用法
- [指南 → 底层 headless 组件](/docs/guides/headless) —— 用 `<HmsScanView>` 自绘 UI
- [API 参考 → Scanner](/docs/api/scanner) —— 完整 API 文档
