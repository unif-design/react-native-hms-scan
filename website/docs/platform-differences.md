---
sidebar_position: 5
title: 平台差异
description: "Android（Scan SDK-Plus / 宿主添加 Huawei Maven / 无 agconnect）与 iOS（ScanKitFrameWork / 相机仅真机 / simulator 可跑非相机测试 / 手电 best-effort）的逐项差异：码制、权限、手电、图片识别 URI。"
---

# 平台差异

`@unif/react-native-hms-scan` 两端 API 接口统一，但底层是不同的华为原生实现，**部分能力存在差异，务必知悉**。

| 维度 | Android | iOS |
| --- | --- | --- |
| 原生实现（相机） | 华为 `RemoteView`（Scan SDK-Plus） | `HmsCustomScanViewController`（ScanKitFrameWork） |
| 原生实现（图片识别） | `ScanUtil.decodeWithBitmap` | `HmsBitMap` |
| 接入配置 | 宿主必须把 Huawei Maven 加到实际依赖解析的 `repositories`;**无需 agconnect / API Key** | `pod install` 自动处理;**无需 AppGallery Connect** |
| 运行环境 | 相机扫码用真机验证 | simulator 可编译、链接并跑非相机测试;**相机扫码仅真机** |
| 最低版本 | minSdkVersion ≥ 24（Android 7.0） | 见 podspec `min_ios_version_supported` |
| 码制 `MULTI_FUNCTIONAL` 作为过滤项 | ✅ 支持 | ❌ 无对应码制（见[码制差异](#formats)） |
| 手电筒 `torch` | ✅ 可编程控制 | ⚠️ best-effort，不保证（见[手电筒](#torch)） |
| 暗光提示 `onTorchStatus.available` | ✅ 据环境光上报 | ❌ 非暗光信号（见[手电筒](#torch)） |
| 权限状态取值范围 | 查询只给 `granted` / `denied`，请求后才可能 `blocked` | 只有 `granted` / `undetermined` / `blocked`，**永不返回 `denied`**（见[相机权限](#permission)） |
| `decodeImage` 接受的 URI | `file://` / 绝对路径 / `content://` / `android.resource://` | `file://` / 绝对路径 / `data:`（**不接受 `ph://` / `content://`**，见[图片识别 URI](#decode-image-uri)） |

:::warning iOS 相机扫码仅真机,但 simulator 链接应成功
podspec 的 `prepare_command` 会生成同时包含 device 与 simulator slice 的 xcframework,因此 simulator 应能编译、链接并运行非相机测试。相机扫码能力仍只能在真机上跑。Apple 芯片 simulator 若出现 `ld: building for 'iOS-simulator', but linking in object file built for 'iOS'`,这是需要重新 `pod install` 并检查 xcframework slices 的集成问题,**不是预期结果**。
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

[`CameraPermissionStatus`](/docs/api/types#camera-permission-status) 的四个值（`granted` / `denied` / `blocked` / `undetermined`）是**两端的并集**，单个平台只产出其中一部分：

| | `getCameraPermissionStatus`（查询） | `requestCameraPermission`（请求后） |
| --- | --- | --- |
| iOS | `granted` / `undetermined` / `blocked` | 同左（**永不返回 `denied`**） |
| Android | 仅 `granted` / `denied` | `granted` / `denied` / `blocked`（据请求后 rationale 区分） |

iOS 原生把 `AVAuthorizationStatus` 映射为：`authorized → granted`、`notDetermined → undetermined`、**`denied` 与 `restricted` 都 → `blocked`**。所以 iOS 侧 `denied` 永远不会出现，别写「iOS 先 `denied` 再 `blocked`」的两级降级分支。

Android 在**查询时**无法可靠区分「永久拒绝」与「从未请求」（两种情况 `shouldShowRequestPermissionRationale` 都是 `false`），故对任何未授权状态返回 `denied`；当前 Android native 不会在查询时返回 `undetermined`，只有执行请求后才可能得到 `blocked`。

:::tip 判断流程以请求后结果为准
Android 要判断是否 `blocked`（永久拒绝、不再弹框）,**以 `requestCameraPermission` 的请求后返回为准**,不要从查询结果推断。`<Scanner>` 内部已用这个流程,用它时无需自己写。详见[指南 → 权限处理](/docs/guides/permissions#get-status)。
:::

---

## 手电筒 {#torch}

### Android

`torch` prop 直接映射到 Scan SDK-Plus 的手电控制接口，**行为稳定、可编程**。`onTorchStatus` 的 `available` 字段会在**环境光线暗**时上报 `true`（来自华为 `OnLightVisibleCallBack`），可据此决定是否显示手电按钮。

### iOS

iOS 端华为 Scan Kit **未提供公开的手电控制接口**（`HmsCustomScanViewController` 自带手电按钮与暗光自检）。本库通过 `AVCaptureDevice` 直接操作手电，属 **best-effort** 实现：

- `torch={true}` **不保证**点亮——华为可能独占相机会话 / 持有配置锁导致操作无效，或设备无手电。
- `onTorchStatus` 会在 `torch` **初次应用及后续 prop 变更**时触发（不据环境光）;`available` 反映「设备是否有手电硬件」,`on` 反映真实点亮状态。**不要**把它当跨平台的暗光提示。

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
| `data:...`（base64 等） | ❌ | ✅ |
| `content://...` | ✅ | ❌ |
| `android.resource://...` | ✅ | ❌ |
| `ph://...` / `assets-library://`（iOS 相册） | ❌ | ❌ |
| `http(s)://...`（远程 URL） | ❌ | ❌ |

- 不支持的 URI（含远程 URL、iOS 的 `ph://`）→ 抛 `E_IMAGE_LOAD_FAILED`（**不是**返回空数组）。
- 跨平台最稳的输入是 **`file://` 或绝对路径**。
- `decodeImage` 不负责申请相册权限;宿主图片选择器 / URI grant 负责让所选 URI 可读。当前两端 native 都不会产生 `E_NO_READ_PERMISSION`。

> 完整 URI 规则与错误码见[函数 → decodeImage](/docs/api/functions#accepted-uri) 与[指南 → 图片识别](/docs/guides/decode-image#accepted-uri)。

---

## 相关

- [指南 → 底层 headless 组件](/docs/guides/headless) — `<HmsScanView>` 使用说明
- [API 参考 → HmsScanView](/docs/api/hms-scan-view) — 完整 props 表，含 `torch` / `onTorchStatus`
- [API 参考 → 函数](/docs/api/functions) — `decodeImage` URI 规则、权限函数
- [常见问题](/docs/troubleshooting) — iOS 真机 / 手电 / 权限相关排障
