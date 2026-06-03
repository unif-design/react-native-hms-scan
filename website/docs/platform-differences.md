---
sidebar_position: 5
title: 平台差异
description: "Android（内置引擎 Scan SDK-Plus / 零配置 / 无 agconnect）与 iOS（ScanKitFrameWork / 仅真机 / 手电 best-effort / onTorchStatus.available 非暗光信号 / decodeImage URI 受限）的逐项能力差异：原生实现、码制、权限四态、手电、暗光提示、图片识别 URI。"
---

# 平台差异

`@unif/react-native-hms-scan` 两端 API 接口统一，但底层是不同的华为原生实现，**部分能力存在差异，务必知悉**。

| 维度 | Android | iOS |
| --- | --- | --- |
| 原生实现（相机） | 华为 `RemoteView`（Scan SDK-Plus） | `HmsCustomScanViewController`（ScanKitFrameWork） |
| 原生实现（图片识别） | `ScanUtil.decodeWithBitmap` | `HmsBitMap` |
| 接入配置 | **零配置**：华为 Maven + `scanplus` 已写在库 gradle，**无需 agconnect / API Key** | `pod install` 自动处理；**无需 AppGallery Connect** |
| 运行环境 | 真机 + 模拟器均可 | **仅真机**（模拟器只能编译，不能扫码） |
| 最低版本 | minSdkVersion ≥ 24（Android 7.0） | 见 podspec `min_ios_version_supported` |
| 码制 `MULTI_FUNCTIONAL` 作为过滤项 | ✅ 支持 | ❌ 无对应码制（见[码制差异](#formats)） |
| 手电筒 `torch` | ✅ 可编程控制 | ⚠️ best-effort，不保证（见[手电筒](#torch)） |
| 暗光提示 `onTorchStatus.available` | ✅ 据环境光上报 | ❌ 非暗光信号（见[手电筒](#torch)） |
| 权限查询四态精度 | 查询时只给 `granted` / `denied` | 查询即返回完整四态（见[相机权限](#permission)） |
| `decodeImage` 接受的 URI | `file://` / 绝对路径 / `content://` / `android.resource://` | `file://` / 绝对路径 / `data:`（**不接受 `ph://` / `content://`**，见[图片识别 URI](#decode-image-uri)） |

:::warning iOS 仅真机
iOS 的 `ScanKitFrameWork` 是华为老式 framework（仅含 arm64 真机 + x86_64 Intel 模拟器切片）。podspec 的 `prepare_command` 已用 Apple 官方 `vtool` 补出 arm64 模拟器切片让模拟器**能编译**，但相机扫码能力**只能在真机上跑**。Apple 芯片模拟器上见到 `ld: building for 'iOS-simulator', but linking in object file built for 'iOS'` **是预期**，切真机即可。
:::

---

## 码制差异 {#formats}

[`BarcodeFormat`](/docs/api/types#barcode-format) 共 **14 种**（不含 `UNKNOWN`），两端枚举值统一。差异在于把它作为 `formats` **过滤项**时：

- `MULTI_FUNCTIONAL` 在 HUAWEI iOS Scan Kit **无对应码制**，作为过滤项在 iOS 上不生效。
- 若传入的 `formats` 只含 iOS 无法识别的项（`MULTI_FUNCTIONAL` / `UNKNOWN`），iOS 会**回退为识别全部码制**而非"什么都不扫"。
- `ITF14` 在 iOS 底层映射到华为的 `ITF` 码制（对外仍是 `ITF14`，无需关心）。

> 不传 `formats`（= 全部码制）时两端行为一致，是最省心的做法。

---

## 相机权限 {#permission}

[`CameraPermissionStatus`](/docs/api/types#camera-permission-status) 取值两端一致（`granted` / `denied` / `blocked` / `undetermined`），但**查询时的精度**不同：

| | `getCameraPermissionStatus`（查询） | `requestCameraPermission`（请求后） |
| --- | --- | --- |
| iOS | 完整四态 | 完整四态 |
| Android | 仅 `granted` / `denied` | 完整四态（`blocked` / `denied` 据请求后 rationale 区分） |

Android 在**查询时**无法可靠区分「永久拒绝」与「从未请求」，故对任何未授权状态返回 `denied`。

:::tip 判断流程以请求后结果为准
要区分 `blocked`（永久拒绝、不再弹框）与 `undetermined`，**以 `requestCameraPermission` 的返回为准**，别只靠查询结果。`<Scanner>` 内部已用这个流程，用它时无需自己写。详见[指南 → 权限处理](/docs/guides/permissions#get-status)。
:::

---

## 手电筒 {#torch}

### Android

`torch` prop 直接映射到 Scan SDK-Plus 的手电控制接口，**行为稳定、可编程**。`onTorchStatus` 的 `available` 字段会在**环境光线暗**时上报 `true`（来自华为 `OnLightVisibleCallBack`），可据此决定是否显示手电按钮。

### iOS

iOS 端华为 Scan Kit **未提供公开的手电控制接口**（`HmsCustomScanViewController` 自带手电按钮与暗光自检）。本库通过 `AVCaptureDevice` 直接操作手电，属 **best-effort** 实现：

- `torch={true}` **不保证**点亮——华为可能独占相机会话 / 持有配置锁导致操作无效，或设备无手电。
- `onTorchStatus` **仅在 `torch` prop 变更时**触发（不据环境光），其 `available` 反映「设备是否有手电硬件」、**不是**暗光信号。**不要**把它当跨平台的暗光提示。

:::tip iOS 上把手电当"提示"而非"保证"
建议 iOS 上手电按钮以「提示」呈现；或在成品 [`<Scanner>`](/docs/api/scanner#props) 上用 `showTorch={false}` 直接隐藏。
:::

---

## 图片识别 URI {#decode-image-uri}

[`decodeImage`](/docs/api/functions#decode-image) 只接受**本地** URI，两端接受形式不同：

| 形式 | Android | iOS |
| --- | --- | --- |
| `file:///...`（文件 URI） | ✅ | ✅ |
| 绝对路径（无 scheme） | ✅ | ✅ |
| `data:...`（base64 等） | — | ✅ |
| `content://...` | ✅ | ❌ |
| `android.resource://...` | ✅ | ❌ |
| `ph://...` / `assets-library://`（iOS 相册） | — | ❌ |
| `http(s)://...`（远程 URL） | ❌ | ❌ |

- 不支持的 URI（含远程 URL、iOS 的 `ph://`）→ 抛 `E_IMAGE_LOAD_FAILED`（**不是**返回空数组）。
- 跨平台最稳的输入是 **`file://` 或绝对路径**。

> 完整 URI 规则与错误码见[函数 → decodeImage](/docs/api/functions#accepted-uri) 与[指南 → 图片识别](/docs/guides/decode-image#accepted-uri)。

---

## 相关

- [指南 → 底层 headless 组件](/docs/guides/headless) — `<HmsScanView>` 使用说明
- [API 参考 → HmsScanView](/docs/api/hms-scan-view) — 完整 props 表，含 `torch` / `onTorchStatus`
- [API 参考 → 函数](/docs/api/functions) — `decodeImage` URI 规则、权限函数
- [常见问题](/docs/troubleshooting) — iOS 真机 / 手电 / 权限相关排障
