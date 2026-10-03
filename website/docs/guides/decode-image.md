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

返回全部 ScanResult；空数组表示 SDK 本次未交付识别结果。桥接格式损坏、非数组或缺少原文的数据是 invalid_response。未知格式不丢失结果，而是 UNKNOWN；缺失可选信息不补造语义。

调用会借用文件至 Promise 结束。自行调用时在 finally 中归还自己管理的文件；交给 Scanner 时使用 ScannerImage.onSourceReleased。关闭页面不能提前删除仍在读取的图片。

## Android 图片预算与坐标

Android 先读取尺寸，再按 2 的幂次采样到最多 8,388,608 像素，并根据 EXIF 校正方向后识别。`cornerPoints` 映射回 **EXIF 校正后的原图像素坐标**，不属于采样图或屏幕坐标；90°/270° 方向的原图宽高会互换。映射使用实际解码宽高，非整除采样也保留对应比例。

单张 ARGB 位图预算为 32 MiB，方向变换时两张位图可临时占用 64 MiB，厂商识别过程另有内存开销。过大的文件或尺寸会以 `invalid_input` 拒绝：文件最多 128 MiB、原始宽高各不超过 32,768、原始总像素不超过 268,435,456。本库检测到读取失败时返回 `image_unavailable`，捕获到解码或识别异常时返回 `decode_failed`，不会主动把这些可检测错误转为空数组。

Android Scan Kit Plus `2.15.0.301` 内部可能在远程解码器创建失败或捕获 `RemoteException` 后返回默认空数组。本库无法将这类 SDK 静默失败与无识别结果区分，因此 `[]` 不能证明图片中确实没有码。

图片任务在独立线程串行执行，最多 1 个执行中、4 个等待中；队列满或模块释放后新请求以 `unavailable` 拒绝。模块释放时等待任务会结束，已经进入识别的任务会持有文件直到实际完成并释放位图，之后才结算 Promise。

采样可能降低特别小的码在大图中的识别率；建议选择主体清晰、码占比合适的图片。上述内存数值是位图预算，不是设备峰值内存或识别率实测。

完整签名与错误见 [函数 API](/docs/api/functions#decode-image)。
