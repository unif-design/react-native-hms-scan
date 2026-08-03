import { forwardRef, type ComponentRef } from 'react';
import type { ViewProps } from 'react-native';
import NativeHmsScanView from './HmsScanViewNativeComponent';
import { formatsToCsv, parseResultsJson } from './format';
import type { BarcodeFormat, ScanError, ScanResult } from './types';

/** 平台相关的暗光提示 / 手电状态。 */
export interface TorchStatus {
  /** Android:环境暗光提示；iOS:设备是否有手电硬件。 */
  available: boolean;
  /** 手电当前是否点亮。 */
  on: boolean;
}

export interface HmsScanViewProps extends ViewProps {
  /** 限定码制；不传 = 全部。 */
  formats?: readonly BarcodeFormat[];
  /** 连续扫码，默认 true。 */
  continuous?: boolean;
  /** 暂停/恢复扫码，默认 false。 */
  paused?: boolean;
  /** 手电筒，默认 false（iOS 为尽力而为）。 */
  torch?: boolean;
  /** 命中一个或多个码时回调（已解析为强类型）。 */
  onScanResult?: (results: ScanResult[]) => void;
  /** 相机/解码出错时回调。 */
  onScanError?: (error: ScanError) => void;
  /** Android 暗光提示或 iOS 手电硬件 / 点亮状态变化时回调。 */
  onTorchStatus?: (status: TorchStatus) => void;
}

/**
 * 底层 headless 扫码相机组件：只渲染相机预览并发出扫码结果事件。
 * 取景框 / 扫描线 / 手电按钮等 UI 由上层（如 `<Scanner>`）用普通 RN 视图叠加绘制。
 *
 * Android = 华为 RemoteView，iOS = HmsCustomScanViewController（Scan SDK-Plus / ScanKitFrameWork）。
 */
export const HmsScanView = forwardRef<
  ComponentRef<typeof NativeHmsScanView>,
  HmsScanViewProps
>(function HmsScanView(
  {
    formats,
    continuous = true,
    paused = false,
    torch = false,
    onScanResult,
    onScanError,
    onTorchStatus,
    ...viewProps
  },
  ref
) {
  return (
    <NativeHmsScanView
      {...viewProps}
      ref={ref}
      formatsCsv={formatsToCsv(formats)}
      continuous={continuous}
      paused={paused}
      torch={torch}
      onScanResult={
        onScanResult
          ? (e) => onScanResult(parseResultsJson(e.nativeEvent.resultsJson))
          : undefined
      }
      onScanError={
        onScanError
          ? (e) =>
              onScanError({
                code: e.nativeEvent.code,
                message: e.nativeEvent.message,
              })
          : undefined
      }
      onTorchStatus={
        onTorchStatus
          ? (e) =>
              onTorchStatus({
                available: e.nativeEvent.available,
                on: e.nativeEvent.on,
              })
          : undefined
      }
    />
  );
});
