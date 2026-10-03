---
sidebar_position: 3
title: 函数
---

# 函数

从包的公开入口导入 `decodeImage`、`getCameraPermissionStatus` 和 `requestCameraPermission`。三项能力彼此独立。

## decodeImage {#decode-image}

```ts
function decodeImage(input: Readonly<DecodeScanImageInput>): Promise<readonly ScanResult[]>;
interface DecodeScanImageInput {
  uri: string;
  formats?: readonly RequestedScanFormat[];
}
```

只接受可读的 `file:///...` URI。调用方负责把相册资源或远程图片准备成本地文件；绝对路径、`content://`、`ph://`、`data:` 和远程地址不是公共输入。URI 原样传入原生，不自动下载、打开相册或申请相机权限。

```tsx
import { decodeImage, ScanError } from '@unif/react-native-hms-scan';

try {
  const results = await decodeImage({
    uri: 'file:///path/to/photo.jpg',
    formats: ['QR_CODE', 'EAN_13'],
  });
  // results 包含本次全部命中；[] 表示成功解码但没有识别到码。
} catch (error) {
  if (error instanceof ScanError) {
    console.log(error.reason, error.message, error.sourceCode);
  }
}
```

Promise 结束表示这次原生读取已结束，调用方可以归还或删除自己管理的文件。不得在关闭页面时提前删除仍被读取的文件。

### 格式过滤 {#accepted-uri}

`formats` 省略或为空都不增加过滤。重复和顺序不改变有效过滤条件。`UNKNOWN` 只用于结果，不接受为过滤输入。iOS 不支持 `MULTI_FUNCTIONAL` 过滤，明确返回 `unsupported`。

### 错误 {#errors}

非法输入抛 `invalid_input`，不可读文件抛 `image_unavailable`，解码异常抛 `decode_failed`，非法桥接结果抛 `invalid_response`。原生模块缺失为 `unavailable`，Web 为 `unsupported`。原生诊断代码保留在可选的 `sourceCode`。完整类型见 [ScanFailure](/docs/api/types#scan-failure)。

## getCameraPermissionStatus {#get-status}

```ts
function getCameraPermissionStatus(): Promise<ScanCameraPermission>;
```

只读真实状态，不弹授权框。读取失败抛 `ScanError`，无法解释的原生状态为 `invalid_response`，不会补成未申请。

## requestCameraPermission {#request}

```ts
function requestCameraPermission(): Promise<ScanCameraPermission>;
```

必要时申请系统权限，返回平台报告的 `granted`、`denied`、`blocked` 或 `undetermined`。打开设置由使用场景决定。Android 读取返回 granted/denied，请求后可返回 blocked；iOS 读取区分 granted/undetermined/blocked。平台差异见 [权限指南](/docs/guides/permissions)。

结果转换与 CSV 映射属于库内部，不提供公共工具出口。
