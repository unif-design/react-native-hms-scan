// Jest mock for @unif/react-native-hms-scan —— 供消费者在测试中替换本库，
// 避免 jest 环境加载 HmsScan TurboModule / HmsScanView Fabric 组件而崩溃。
//
// 用法（消费者 jest setup 或单个测试文件）：
//
//   jest.mock('@unif/react-native-hms-scan', () =>
//     require('@unif/react-native-hms-scan/mock')
//   );
//
// 替换后 decodeImage / 权限方法都是 jest.fn；<HmsScanView> / <Scanner> 渲染为 null。
// 按需覆盖单次返回：
//   (decodeImage as jest.Mock).mockResolvedValueOnce([{ value: '690...', format: 'EAN_13' }]);

import type { FC } from 'react';
import type {
  CameraPermissionStatus,
  DecodeImageOptions,
  ScanResult,
} from './types';
import type { HmsScanViewProps } from './HmsScanView';
import type { ScannerProps } from './Scanner/Scanner';

// 纯 JS 类型 / 常量 / Error / 码制工具：保留真实实现（不碰原生）。
export * from './types';
export { coerceFormat, coerceContentType, formatsToCsv } from './format';

// ── 图片识别 ──
export const decodeImage = jest.fn(
  (_uri: string, _options?: DecodeImageOptions): Promise<ScanResult[]> =>
    Promise.resolve([])
);

// ── 相机权限 ──（默认已授权）
export const getCameraPermissionStatus = jest.fn(
  (): Promise<CameraPermissionStatus> => Promise.resolve('granted')
);
export const requestCameraPermission = jest.fn(
  (): Promise<CameraPermissionStatus> => Promise.resolve('granted')
);

// ── 组件 ──（渲染 null，避免触碰原生）
export const HmsScanView: FC<HmsScanViewProps> = () => null;
export const Scanner: FC<ScannerProps> = () => null;
