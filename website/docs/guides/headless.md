---
sidebar_position: 2
title: 底层 headless 组件
description: 使用 <HmsScanView> 完全自定义扫码 UI——formats、torch、paused、onScanResult、onTorchStatus。
---

# 底层 headless 组件

`<HmsScanView>` 是底层 headless 扫码相机组件：只渲染相机预览并发出扫码结果事件。取景框 / 扫描线 / 手电按钮等 UI 完全由上层用普通 RN 视图叠加绘制。

需要完全自定义扫码界面时使用此组件；如需开箱即用的成品页，请直接使用 [`<Scanner>`](/docs/guides/scanner)。

---

## 基本用法

```tsx
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { HmsScanView, type ScanResult } from '@unif/react-native-hms-scan';

function CustomScanScreen() {
  const [paused, setPaused] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const handleResult = (results: ScanResult[]) => {
    const code = results[0]?.value;
    if (code) {
      setPaused(true); // 命中后暂停继续扫
      // 处理扫码结果 ...
    }
  };

  return (
    <View style={styles.container}>
      <HmsScanView
        style={StyleSheet.absoluteFill}
        formats={['QR_CODE', 'EAN_13']}
        torch={torchOn}
        paused={paused}
        onScanResult={handleResult}
        onScanError={(e) => {
          // 处理错误，e.code / e.message
        }}
      />
      {/* 在这里叠加取景框、按钮等自定义 UI */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
```

---

## 连续扫码与暂停

- `continuous`（默认 `true`）：启用连续扫码模式，每次命中都触发 `onScanResult`。
- `paused`（默认 `false`）：暂停扫码。命中后将 `paused` 设为 `true` 可停在结果画面，处理完后再置 `false` 恢复。

```tsx
// 扫到后暂停，展示结果，用户确认后恢复
const [paused, setPaused] = useState(false);

<HmsScanView
  paused={paused}
  onScanResult={(results) => {
    setPaused(true);
    handleCode(results[0]?.value);
  }}
/>
```

---

## 手电筒

```tsx
const [torch, setTorch] = useState(false);

<HmsScanView
  torch={torch}
  onTorchStatus={(status) => {
    // status.available: 环境暗到建议显示手电按钮（仅 Android 上报）
    // status.on: 手电当前是否点亮
  }}
/>
```

:::warning 手电筒平台差异
- **Android**：`torch` 可编程控制，`onTorchStatus.available` 会上报暗光提示。
- **iOS**：HMS 无公开手电 API；本库走 `AVCaptureDevice` **尽力而为**，不保证稳定可控；`onTorchStatus.available` 不上报。

详见[平台差异](/docs/platform-differences)。
:::

---

## 相关

- [API 参考 → HmsScanView](/docs/api/hms-scan-view) — 完整 props 表
- [平台差异](/docs/platform-differences) — 手电筒、暗光提示的平台行为对比
- [指南 → 成品扫一扫页](/docs/guides/scanner) — 需要开箱即用的完整页面
