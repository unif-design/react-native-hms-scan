import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import NativeHmsScanView from '../HmsScanViewNativeComponent';
import { formatConfiguration, parseResultsJson } from '../format';
import { scanError } from '../errors';
import type { ScanResult } from '../types';
import type { HmsScanViewProps } from './types';

export function HmsScanView({
  formats,
  continuous = true,
  paused = false,
  torch = false,
  onScanResult,
  onScanError,
  onTorchState,
  ...viewProps
}: HmsScanViewProps) {
  const config = formatConfiguration(formats);
  const invalid = config.error;
  const errorRef = useRef(onScanError);
  errorRef.current = onScanError;
  useEffect(() => {
    if (invalid) errorRef.current?.(invalid);
  }, [invalid?.message]);
  if (invalid) return <View {...viewProps} />;
  return (
    <NativeHmsScanView
      {...viewProps}
      formatsCsv={config.csv}
      continuous={continuous}
      paused={paused}
      torch={torch}
      onScanResult={(event) => {
        let results: readonly ScanResult[];
        try {
          results = parseResultsJson(event.nativeEvent.resultsJson);
        } catch (error) {
          onScanError?.(
            scanError(error, {
              reason: 'invalid_response',
              message: '扫码结果无法识别',
            })
          );
          return;
        }
        onScanResult?.(results);
      }}
      onScanError={(event) =>
        onScanError?.(
          scanError(event.nativeEvent, {
            reason: 'unavailable',
            message: '扫码相机不可用',
          })
        )
      }
      onTorchState={(event) => {
        const state = event.nativeEvent;
        onTorchState?.({
          on: state.on,
          ...(state.hasAvailable ? { available: state.available } : {}),
          ...(state.hasLowLight ? { lowLight: state.lowLight } : {}),
        });
      }}
    />
  );
}
