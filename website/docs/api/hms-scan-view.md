---
sidebar_position: 2
title: HmsScanView
description: "<HmsScanView> 底层 headless 扫码相机组件完整 props 参考：formats / continuous / paused / torch / onScanResult / onScanError / onTorchStatus，以及 TorchStatus 类型与 onScanError 的 code（E_CAMERA_INIT / E_NO_RESULT）。"
---

# HmsScanView

底层 headless 扫码相机组件：**只渲染相机预览并发出扫码事件**，取景框 / 扫描线 / 手电按钮等 UI 由上层（如 [`<Scanner>`](/docs/api/scanner)）用普通 RN 视图叠加绘制。需要自定义扫码界面时用它；要开箱即用的整屏扫码页用 `<Scanner>`。

```tsx
import { HmsScanView } from '@unif/react-native-hms-scan';
```

原生实现：Android = 华为 `RemoteView`（Scan SDK-Plus），iOS = `HmsCustomScanViewController`（ScanKitFrameWork）。

---

## 签名

```tsx
const HmsScanView: ForwardRefExoticComponent<
  HmsScanViewProps & RefAttributes<...>
>
```

`HmsScanViewProps` 继承自 `ViewProps`——所有标准 `View` props（如 `style`）均可传入。

---

## Props {#props}

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `style` | `StyleProp<ViewStyle>` | — | 布局样式，通常设 `StyleSheet.absoluteFill` 或 `{ flex: 1 }`（继承自 `ViewProps`） |
| `formats` | `BarcodeFormat[]` | — | 限定识别码制；不传 = 全部（[14 种](/docs/api/types#barcode-format)） |
| `continuous` | `boolean` | `true` | 连续扫码模式；`false` 命中后停止 |
| `paused` | `boolean` | `false` | 暂停 / 恢复扫码；命中后置 `true` 可停在结果画面 |
| `torch` | `boolean` | `false` | 手电筒开关（**iOS 为 best-effort**，见[平台差异](/docs/platform-differences#torch)） |
| `onScanResult` | `(results: ScanResult[]) => void` | — | 命中一个或多个码时回调（原生 JSON 已解析为强类型） |
| `onScanError` | `(error: { code: string; message: string }) => void` | — | 相机 / 解码出错时回调，见 [error.code](#error-codes) |
| `onTorchStatus` | `(status: TorchStatus) => void` | — | 手电状态回调;Android 还承载暗光提示,见 [TorchStatus](#torch-status) |

:::note formats 变更会重建相机
两端都在初始化时按 `formats` 创建扫码器，运行中改变 `formats`（或 `continuous`）会**重建**底层相机视图。若需频繁切换码制，建议传一个稳定的全集而非频繁变更。
:::

---

## TorchStatus {#torch-status}

`onTorchStatus` 回调参数类型。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `available` | `boolean` | Android:环境暗到建议显示手电按钮;iOS:设备是否有手电硬件 |
| `on` | `boolean` | 手电当前是否点亮 |

:::warning available 的暗光语义仅 Android
`available` 作为「**环境暗、建议显示手电**」的提示只有 Android 会据环境光上报（来自华为 `OnLightVisibleCallBack`）。iOS 会在 `torch` **初次应用和后续 prop 变更**时触发 `onTorchStatus`;`available` 表示设备是否有手电硬件,`on` 表示真实点亮状态,二者都不是环境光信号。详见[平台差异](/docs/platform-differences#torch)。
:::

---

## error.code {#error-codes}

`onScanError` 回调的 `error.code`（字符串；**不是** `HmsScanError` 实例）：

| `code` | 平台 | 含义 |
| --- | --- | --- |
| `E_CAMERA_INIT` | Android | 相机 / 预览初始化失败（如无宿主 Activity） |
| `E_NO_RESULT` | iOS | 解码结果为空或无法解析（软错误） |

> `<HmsScanView>` **不含权限请求逻辑**——渲染前需先确认已获得相机权限（见[指南 → 权限处理](/docs/guides/permissions)）。`<Scanner>` 会自动处理权限。

---

## 示例

```tsx
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { HmsScanView, type ScanResult } from '@unif/react-native-hms-scan';

function CustomScan() {
  const [paused, setPaused] = useState(false);
  const [torch, setTorch] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <HmsScanView
        style={StyleSheet.absoluteFill}
        formats={['QR_CODE', 'EAN_13']}
        torch={torch}
        paused={paused}
        onScanResult={(results: ScanResult[]) => {
          const code = results[0]?.value;
          if (code) setPaused(true); // 命中后停帧
        }}
        onScanError={(e) => {
          // e.code: 'E_CAMERA_INIT'（Android）/ 'E_NO_RESULT'（iOS）
        }}
        onTorchStatus={(status) => {
          // Android: available 是暗光提示；iOS: available 是硬件能力，on 是真实状态
        }}
      />
      {/* 自定义取景框 / 按钮叠加在这里 */}
    </View>
  );
}
```

更多模式见[指南 → 底层 headless 组件](/docs/guides/headless)。

---

## 注意事项

- `paused` 置 `true` 时相机画面保持但停止解码，适合命中后停帧展示结果。
- `continuous` 模式下同一帧可能多次回调，业务侧需自行去重（如置 `paused`）。
- `torch` 在 iOS 端为 best-effort 实现，详见[平台差异](/docs/platform-differences#torch)。

---

## 平台兼容性

| 平台 | 支持 | 备注 |
| --- | --- | --- |
| iOS（真机） | ✅ | `torch` best-effort；`onTorchStatus.available` 非暗光信号；模拟器无法扫码 |
| Android | ✅ | 全功能支持 |
| Web | ❌ | — |

---

## 相关

- [平台差异](/docs/platform-differences) — 手电筒与暗光提示的详细对比
- [指南 → 底层 headless 组件](/docs/guides/headless) — 使用示例与典型模式
- [API 参考 → Scanner](/docs/api/scanner) — 开箱即用的成品扫码页
- [API 参考 → 类型](/docs/api/types) — `ScanResult` / `BarcodeFormat`
