---
sidebar_position: 4
title: 类型
---

# 类型

公共类型与 `ScanError` 从 `@unif/react-native-hms-scan` 导入。类型定义不加载原生能力。

## ScanFormat 与 RequestedScanFormat {#scan-format}

```ts
type ScanFormat = 'QR_CODE' | 'AZTEC' | 'DATA_MATRIX' | 'PDF417'
  | 'CODABAR' | 'CODE_39' | 'CODE_93' | 'CODE_128' | 'EAN_8'
  | 'EAN_13' | 'UPC_A' | 'UPC_E' | 'ITF14' | 'MULTI_FUNCTIONAL' | 'UNKNOWN';
type RequestedScanFormat = Exclude<ScanFormat, 'UNKNOWN'>;
```

格式清单、类型和输入校验由同一代码定义取得。未知结果统一为 UNKNOWN；过滤省略或空数组表示不增加过滤。iOS 不支持 MULTI_FUNCTIONAL，明确返回 unsupported。

## ScanResult {#scan-result}

```ts
type ScanContentType = 'TEXT' | 'URL' | 'EMAIL' | 'PHONE' | 'SMS'
  | 'WIFI' | 'CONTACT' | 'EVENT' | 'LOCATION' | 'DRIVER' | 'ISBN' | 'ARTICLE' | 'OTHER';
interface ScanPoint { x: number; y: number }
interface ScanResult {
  value: string;
  format: ScanFormat;
  contentType?: ScanContentType;
  cornerPoints?: readonly ScanPoint[];
}
```

`value` 保留原文，包括空白和前导零。库不打开地址、不转换商品数量。语义类型和角点只有真实取得时才提供；角点为原识别图像坐标，不是屏幕坐标。缺少可选信息不会丢弃有效结果。

## ScanFailure 与 ScanError {#scan-failure}

```ts
interface ScanFailure {
  reason: 'invalid_input' | 'permission_denied' | 'image_unavailable'
    | 'decode_failed' | 'invalid_response' | 'unavailable' | 'unsupported';
  message: string;
  sourceCode?: string;
}
class ScanError extends Error implements ScanFailure {
  readonly reason: ScanFailure['reason'];
  readonly sourceCode?: string;
  constructor(error: Readonly<ScanFailure>);
}
```

Promise 拒绝使用 ScanError，组件回调接受只读 ScanFailure。`sourceCode` 用于原生诊断，业务分支使用稳定 `reason`。

## ScanCameraPermission {#camera-permission-status}

```ts
type ScanCameraPermission = 'granted' | 'denied' | 'blocked' | 'undetermined';
```

读取错误和未知桥接值会抛错，不伪装成权限被拒绝。

## ScanTorchState {#torch-state}

```ts
interface ScanTorchState {
  on: boolean;
  available?: boolean;
  lowLight?: boolean;
}
```

`on` 是实际点亮状态，`available` 是硬件能力，`lowLight` 是环境暗光。无法取得的可选字段省略。

## ScannerImage {#scanner-image}

```ts
interface ScannerImage {
  uri: string;
  onSourceReleased?(): void;
}
```

`uri` 是可读 file URI。`onSourceReleased` 在读取真正结束，或迟到选图不再启动读取时通知一次。文件仍由提供者管理，Scanner 不删除文件。

组件输入见 [Scanner](/docs/api/scanner) 与 [HmsScanView](/docs/api/hms-scan-view)；图片输入见 [函数](/docs/api/functions)。
