---
sidebar_position: 2
title: 快速上手
---

# 快速开始

完成 [安装](/docs/getting-started/installation) 后，在原生页面使用 Scanner。

```tsx
import { Scanner } from '@unif/react-native-hms-scan';

export function ScanPage() {
  return (
    <Scanner
      onConfirm={(result) => {
        console.log(result.value, result.format);
        // 在所属场景消费原文，并结束这次扫码页面。
      }}
      onClose={() => navigation.goBack()}
      onError={(error) => reportError(error.reason, error.message)}
    />
  );
}
```

默认标题“扫一扫”，自动处理相机权限，识别后显示原文/码制选用卡。onConfirm 必填，每轮最多一次，选用后不会自动重扫。autoConfirm 可跳过卡片，直接交付。

Scanner 继承 Design 主题与字号，并使用真实安全区。pickImage 可接入应用已有图片选择器及文件释放回调。详见 [组合扫码页](/docs/guides/scanner)。

需要自定义界面或完整多码结果时使用 [HmsScanView](/docs/api/hms-scan-view)；只读一张图片时使用 [decodeImage](/docs/api/functions)。Web 不提供设备实现，公开入口报告 unsupported。
