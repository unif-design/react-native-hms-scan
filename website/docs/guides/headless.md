---
sidebar_position: 2
title: 底层 headless 组件
---

# 自定义扫码预览

先读取或申请相机权限，仅在 granted 时挂载 HmsScanView。设备事件只交付识别结果，业务选择由你的页面处理。

```tsx
import { HmsScanView, getCameraPermissionStatus, requestCameraPermission } from '@unif/react-native-hms-scan';

let permission = await getCameraPermissionStatus();
if (permission === 'denied' || permission === 'undetermined') {
  permission = await requestCameraPermission();
}
// 将 permission 保存到页面状态。

// 页面中：
{permission === 'granted' && (
  <HmsScanView
    style={{ flex: 1 }}
    continuous={false}
    onScanResult={(results) => setResults(results)}
    onScanError={(error) => showError(error)}
    onTorchState={(state) => setTorchState(state)}
  />
)}
```

每次事件包含完整批次。value 不做业务解析，可选角点是图像坐标。paused 控制本轮接受；continuous 默认 true。格式省略/空数组不增加过滤，iOS 请求 MULTI_FUNCTIONAL 返回 unsupported。

相机技术错误后应停止预览，让用户明确重试并重新读取权限。从系统设置返回时读取实际状态，不重放旧结果。

`torch` 请求和实际点亮状态分开保存；`available` 是硬件，`lowLight` 是可选暗光提示。完整属性见 [HmsScanView API](/docs/api/hms-scan-view)。
