---
sidebar_position: 4
title: 权限处理
---

# 相机权限

```tsx
import { getCameraPermissionStatus, requestCameraPermission, ScanError } from '@unif/react-native-hms-scan';

try {
  let status = await getCameraPermissionStatus();
  if (status === 'undetermined' || status === 'denied') {
    status = await requestCameraPermission();
  }
  // granted 才启动相机；blocked 时由页面提供系统设置入口。
} catch (error) {
  if (error instanceof ScanError) showFailure(error.reason, error.message);
}
```

读取只调用平台读取入口，不弹授权。读取失败不会返回 denied；未知桥接值是 invalid_response，不自动申请。

Android 查询返回 granted/denied，请求后可报告 blocked。iOS 查询区分 granted/undetermined/blocked，系统 denied/restricted 归为 blocked。应用直接消费公共状态，不再维护平台映射。

Scanner 在进入时处理此权限流程，失败通过 onError 上报；相机致命错误停止本轮，明确重试重新读权限。从设置返回时只读取一次实际状态。自定义 HmsScanView 由消费者先取得权限。纯 decodeImage 不需要相机权限。

原生接线见 [安装](/docs/getting-started/installation)。
