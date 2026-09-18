---
sidebar_position: 1
title: 介绍
description: 'React Native 扫码库：成品页面、自定义预览与本地图片识别。'
---

# HMS Scan 扫码

基于 HUAWEI Scan Kit 的 React Native 扫码库，支持二维码、条码和本地图片识别。由 Unif 维护，可供其他 React Native 项目复用。

## 选择用法

| 需求               | 入口                                     |
| ------------------ | ---------------------------------------- |
| 使用完整扫一扫页面 | [Scanner](/docs/api/scanner)             |
| 自定义扫码界面     | [HmsScanView](/docs/api/hms-scan-view)   |
| 只识别本地图片     | [decodeImage](/docs/guides/decode-image) |

`Scanner` 组合预览、权限和确认界面；`HmsScanView` 提供预览与事件，应用负责界面和权限协调。`decodeImage` 独立处理本地图片，正常识别但没有码时返回 `[]`，读取或解码失败抛出错误。

## 开始使用

先完成[安装与原生配置](/docs/getting-started/installation)，再阅读[快速上手](/docs/getting-started/quick-start)。图片选择、业务查询和导航由应用提供。

## 平台说明

- Android 使用内置 Scan SDK-Plus 引擎，不要求华为手机或 HMS Core；宿主配置 Huawei Maven。
- iOS 使用官方 ScanKit CocoaPod，原生构建和运行仅支持真机。
- 两端均需要 React Native 新架构，无需 AppGallery Connect 或 API Key。
- Web 不提供原生扫码；mock 仅用于逻辑测试。

[权限处理](/docs/guides/permissions) · [平台差异](/docs/platform-differences) · [测试](/docs/testing) · [常见问题](/docs/troubleshooting)
