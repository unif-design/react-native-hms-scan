---
sidebar_position: 5
title: 平台差异
description: Android RemoteView 与 iOS HmsCustomScanViewController 的能力差异——手电筒、变焦、暗光提示。
---

# 平台差异

`<HmsScanView>` 在两端使用不同的原生实现：

- **Android**：华为 `RemoteView`（Scan SDK-Plus）
- **iOS**：`HmsCustomScanViewController`（ScanKitFrameWork）

两端 API 接口统一，但部分能力存在差异，务必知悉。

:::warning iOS 仅真机
iOS 的 `ScanKitFrameWork` 是 arm64-only 静态库，仅在真机上运行。模拟器走 x86_64，无法使用扫码功能。
:::

---

## 能力对比

| 能力 | Android（`RemoteView`） | iOS（`HmsCustomScanViewController`） |
| --- | --- | --- |
| 手电筒 `torch` | ✅ 可编程控制 | ⚠️ HMS 无公开手电 API；本库走 `AVCaptureDevice` **尽力而为**，不保证 |
| 变焦 | ❌ 仅内部自动 | ❌ 仅内部自动 |
| 暗光提示 `onTorchStatus.available` | ✅ 上报 | ❌ 不上报 |

---

## 手电筒

### Android

Android 端 `torch` prop 直接映射到 Scan SDK-Plus 的手电控制接口，行为稳定可编程。`onTorchStatus` 回调的 `available` 字段会在环境光线暗时上报 `true`，可据此决定是否显示手电按钮。

### iOS

iOS 端 HMS 框架未提供公开的手电控制接口。本库通过 `AVCaptureDevice` 直接操作手电，属"尽力而为"实现：

- `torch={true}` **不保证**手电一定点亮（设备差异 / 系统限制）
- `onTorchStatus.available` **不会上报**（始终不触发）
- 建议 iOS 上手电按钮以"提示"而非"保证"的方式向用户呈现

---

## 相关

- [指南 → 底层 headless 组件](/docs/guides/headless) — `<HmsScanView>` 使用说明
- [API 参考 → HmsScanView](/docs/api/hms-scan-view) — 完整 props 表，含 `torch` / `onTorchStatus`
