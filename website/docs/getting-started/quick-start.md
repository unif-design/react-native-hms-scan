---
sidebar_position: 2
title: 快速上手
description: '挂载 Scanner，由页面处理识别结果、关闭和错误。'
---

# 快速开始

完成 [安装](/docs/getting-started/installation) 后，在原生页面使用 Scanner。宿主 Babel 的 `plugins` 最后一项需为 `react-native-worklets/plugin`，并在应用根接入 `GestureHandlerRootView`；已有手势根时直接复用。

下面的页面组件接收应用提供的结果、关闭和错误回调。应用在确认或关闭时结束扫码页，在错误回调中记录或显示原因。

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Scanner, type ScannerProps } from '@unif/react-native-hms-scan';

type ScanPageProps = Pick<ScannerProps, 'onConfirm' | 'onClose' | 'onError'>;

export function ScanPage({ onConfirm, onClose, onError }: ScanPageProps) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Scanner onConfirm={onConfirm} onClose={onClose} onError={onError} />
    </GestureHandlerRootView>
  );
}
```

默认标题“扫一扫”，自动处理相机权限，识别后显示原文/码制选用卡。onConfirm 必填，每轮最多一次，选用后不会自动重扫。autoConfirm 可跳过卡片，直接交付。

Scanner 继承 Design 主题与字号，并使用真实安全区；没有外层 SafeAreaProvider 时由组件局部测量安全区。pickImage 可接入应用已有图片选择器及文件释放回调。详见 [组合扫码页](/docs/guides/scanner)。

需要自定义界面或完整多码结果时使用 [HmsScanView](/docs/api/hms-scan-view)；只读一张图片时使用 [decodeImage](/docs/api/functions)。Web 不提供设备实现，公开入口报告 unsupported。
