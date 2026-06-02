---
sidebar_position: 2
title: HmsScanView
description: "<HmsScanView> 底层 headless 扫码相机组件完整 props 参考——formats、continuous、paused、torch、onScanResult、onTorchStatus。"
---

# HmsScanView

底层 headless 扫码相机组件：只渲染相机预览并发出扫码结果事件，取景框 / 扫描线 / 手电按钮等 UI 由上层自行叠加。

```tsx
import { HmsScanView } from '@unif/react-native-hms-scan';
```

---

## 签名

```tsx
const HmsScanView = forwardRef<HmsScanViewRef, HmsScanViewProps>(...)
```

`HmsScanViewProps` 继承自 `ViewProps`（所有标准 `View` props 均可传入，如 `style`）。

---

## Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `style` | `ViewStyle` | — | 组件布局样式，通常设为 `StyleSheet.absoluteFill` 或 `{ flex: 1 }` |
| `formats` | `BarcodeFormat[]` | — | 限定识别码制；不传 = 全部 |
| `continuous` | `boolean` | `true` | 连续扫码模式；`false` 时命中一次后停止 |
| `paused` | `boolean` | `false` | 暂停/恢复扫码；命中后置 `true` 可停在结果画面 |
| `torch` | `boolean` | `false` | 手电筒开关（iOS 为尽力而为，见平台差异） |
| `onScanResult` | `(results: ScanResult[]) => void` | — | 命中一个或多个码时回调（已解析为强类型） |
| `onScanError` | `(error: { code: string; message: string }) => void` | — | 相机/解码出错时回调 |
| `onTorchStatus` | `(status: TorchStatus) => void` | — | 暗光提示 / 手电状态变化时回调（Android 专用上报，见平台差异） |

---

## TorchStatus

`onTorchStatus` 回调参数类型：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `available` | `boolean` | 环境暗到建议显示手电按钮（**仅 Android 上报**） |
| `on` | `boolean` | 手电当前是否点亮 |

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
          if (code) setPaused(true);
        }}
        onScanError={(e) => {
          // 处理 e.code / e.message
        }}
        onTorchStatus={(status) => {
          // Android: status.available 暗光提示
        }}
      />
      {/* 自定义取景框 / 按钮叠加在这里 */}
    </View>
  );
}
```

---

## 注意事项

- `<HmsScanView>` 不包含权限请求逻辑，需在渲染前确认已获得相机权限（参见[指南 → 权限处理](/docs/guides/permissions)）。
- `paused` 置 `true` 时相机画面保持但停止解码，适合命中后停帧展示结果。
- `torch` 在 iOS 端为尽力而为实现，详见[平台差异](/docs/platform-differences)。

---

## 平台兼容性

| 平台 | 支持 | 备注 |
| --- | --- | --- |
| iOS（真机） | ✅ | `torch` 尽力而为；`onTorchStatus.available` 不上报 |
| Android | ✅ | 全功能支持 |
| Web | ❌ | — |

---

## 相关

- [平台差异](/docs/platform-differences) — 手电筒与暗光提示的详细对比
- [指南 → 底层 headless 组件](/docs/guides/headless) — 使用示例与典型模式
- [API 参考 → Scanner](/docs/api/scanner) — 开箱即用的成品扫码页
