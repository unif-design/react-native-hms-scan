---
sidebar_position: 2
title: 底层 headless 组件
description: "用 <HmsScanView> 完全自定义扫码 UI：只出相机预览 + 抛事件，取景框/手电按钮自绘。props：formats（省略=全部）、continuous（默认 true）、paused（默认 false）、torch（默认 false，iOS best-effort）、onScanResult(results)、onScanError、onTorchStatus（available 仅 Android）。"
---

# 底层 headless 组件

`<HmsScanView>` 是底层 headless 扫码相机组件:**只渲染相机预览并抛出扫码事件**,取景框 / 扫描线 / 手电按钮等 UI 完全由你用普通 RN 视图叠加绘制。

需要完全自定义扫码界面时用它;如果只想要现成的扫一扫页,直接用 [`<Scanner>`](/docs/guides/scanner)。

:::tip 它只负责相机 + 事件
`<HmsScanView>` 不画任何覆盖层(没有取景框、没有手电按钮)。你把它铺满容器,然后在它上面叠自己的 UI。`<Scanner>` 正是这样在它之上叠了一整套界面。
:::

---

## 基本用法 {#basic}

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
        style={StyleSheet.absoluteFill}        // 铺满容器
        formats={['QR_CODE', 'EAN_13']}        // 省略 = 全部 14 种码制
        torch={torchOn}
        paused={paused}
        onScanResult={handleResult}
        onScanError={(e) => {
          // e.code / e.message
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

`<HmsScanView>` 继承 `ViewProps`,`style` 等标准视图属性可直接传。务必给它一个有尺寸的容器(如 `flex: 1` + `StyleSheet.absoluteFill`),否则相机预览不可见。

---

## 限定码制 `formats` {#formats}

`formats` 限定识别哪些码制,**不传 = 识别全部 14 种**:

```tsx
<HmsScanView formats={['QR_CODE', 'EAN_13']} onScanResult={...} />
```

> 内部把 `formats[]` 转成 CSV 传给原生(`formatsToCsv`),空 / 未传 → 识别全部。全部码制清单见 [API → BarcodeFormat](/docs/api/types)。

---

## 扫码结果 `onScanResult` {#on-scan-result}

命中一个或多个码时回调,参数是**已解析为强类型**的 `ScanResult[]`(原生回传的 JSON 在组件内已解析、并对脏数据做了防御性过滤):

```tsx
<HmsScanView
  onScanResult={(results) => {
    const first = results[0];
    if (!first) return;
    console.log(first.value, first.format); // 码内容、码制
  }}
/>
```

每个 `ScanResult` 含 `value`(原始文本)、`format`(码制)、可选 `contentType`(内容语义)、可选 `cornerPoints`(四角点)。详见 [API → ScanResult](/docs/api/types)。

---

## 连续扫码与暂停 `continuous` / `paused` {#continuous-paused}

- **`continuous`**(默认 `true`)—— 连续扫码,每次命中都触发 `onScanResult`。
- **`paused`**(默认 `false`)—— 暂停扫码。命中后把 `paused` 设为 `true` 可停在结果画面,处理完再置 `false` 恢复。

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

## 手电筒 `torch` / `onTorchStatus` {#torch}

```tsx
const [torch, setTorch] = useState(false);

<HmsScanView
  torch={torch}
  onTorchStatus={(status) => {
    // status.available: 环境暗到建议显示手电按钮（仅 Android 上报）
    // status.on:        手电当前是否点亮
  }}
/>
```

:::warning 手电筒平台差异
- **Android** —— `torch` 可编程控制;`onTorchStatus.available` 会在暗光时上报 `true`,可据此决定是否显示手电按钮。
- **iOS** —— HMS 无公开手电 API,本库走 `AVCaptureDevice` **尽力而为**,不保证点亮;`onTorchStatus.available` **永不上报**(始终不触发)。

所以**别把 `onTorchStatus.available` 当作跨平台的暗光信号** —— iOS 上它不会来。详见[平台差异 → 手电筒](/docs/platform-differences#torch)。
:::

---

## 出错回调 `onScanError` {#on-scan-error}

相机 / 解码出错时回调,参数为 `{ code, message }`:

```tsx
<HmsScanView
  onScanError={(e) => {
    if (e.code === 'E_NO_CAMERA_PERMISSION') {
      // 引导请求 / 去设置；权限 API 见下方链接
    }
    // 其它：查 e.message
  }}
/>
```

> headless 模式下相机权限**由你自己管**(不像 `<Scanner>` 自动处理):进入扫码页前先用 `requestCameraPermission` 确保已授权。见[权限处理](/docs/guides/permissions)。

---

## 相关

- [API 参考 → HmsScanView](/docs/api/hms-scan-view) —— 完整 props 表
- [平台差异](/docs/platform-differences) —— 手电筒、暗光提示的平台行为对比
- [指南 → 权限处理](/docs/guides/permissions) —— headless 模式自行请求相机权限
- [指南 → 成品扫一扫页](/docs/guides/scanner) —— 需要开箱即用的完整页面
