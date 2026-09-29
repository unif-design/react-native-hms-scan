---
sidebar_position: 3
title: 图片识别
---

# 图片识别

```tsx
import { decodeImage, ScanError } from '@unif/react-native-hms-scan';

try {
  const results = await decodeImage({
    uri: 'file:///path/to/image.jpg',
    formats: ['QR_CODE'],
  });
  if (results.length === 0) {
    showNoCode();
  } else {
    showResults(results);
  }
} catch (error) {
  if (error instanceof ScanError) showFailure(error.reason, error.message);
}
```

只识别调用方准备的可读本地 file URI，不开启相机、不打开选择器、不下载图片，也不申请相机权限。相册资源是 content:// 或 ph:// 时，由选择能力先准备本地文件。

返回全部 ScanResult；真实无结果为 []。桥接格式损坏、非数组或缺少原文的数据是 invalid_response。未知格式不丢失结果，而是 UNKNOWN；缺失可选信息不补造语义。

调用会借用文件至 Promise 结束。自行调用时在 finally 中归还自己管理的文件；交给 Scanner 时使用 ScannerImage.onSourceReleased。关闭页面不能提前删除仍在读取的图片。

完整签名与错误见 [函数 API](/docs/api/functions#decode-image)。
