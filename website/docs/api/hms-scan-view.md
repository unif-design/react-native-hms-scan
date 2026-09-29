---
sidebar_position: 2
title: HmsScanView
---

# HmsScanView

底层相机预览，交付完整识别批次。消费者负责在挂载前取得相机授权；取景框、结果展示与业务交互由消费者组合。

```tsx
<HmsScanView
  style={{ flex: 1 }}
  formats={['QR_CODE', 'EAN_13']}
  paused={false}
  continuous
  torch={requestedTorch}
  onScanResult={(results) => setResults(results)}
  onScanError={(error) => showError(error.reason)}
  onTorchState={(state) => setActualTorch(state.on)}
/>
```

## Props

继承 React Native ViewProps。

| 属性 | 类型 | 默认值 |
| --- | --- | --- |
| formats | readonly RequestedScanFormat[] | 无额外过滤 |
| paused | boolean | false |
| continuous | boolean | true |
| torch | boolean | false |
| onScanResult | (results: readonly ScanResult[]) => void | 本次完整集合 |
| onScanError | `(error: Readonly<ScanFailure>) => void` | 技术错误 |
| onTorchState | `(state: Readonly<ScanTorchState>) => void` | 实际手电与已知环境状态 |

结果与图片解码使用同一转换边界。非法桥接数据上报 invalid_response，不伪装为空数组。未知格式为 UNKNOWN，可选字段只在取得时提供。

## 手电 {#torch-state}

`torch` 是请求；`onTorchState.on` 才是实际点亮回报。`available` 两端都表示硬件能力，`lowLight` 是 Android 暗光反馈，iOS 未取得时省略。iOS 通过 AVFoundation 尽力控制，厂商可能占用设备锁，UI 必须采用实际回报。

## 平台

Android 使用 Huawei RemoteView；iOS 使用官方 ScanKitFrameWork 1.1.2.305，只支持其二进制真实提供的真机平台。Web 安全加载入口，但设备操作报告 unsupported。详见 [平台差异](/docs/platform-differences)。
