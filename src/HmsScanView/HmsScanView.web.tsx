import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { unsupportedScanError } from '../errors';
import type { HmsScanViewProps } from './types';

export function HmsScanView({
  onScanError,
  formats: _formats,
  paused: _paused,
  torch: _torch,
  continuous: _continuous,
  onScanResult: _onScanResult,
  onTorchState: _onTorchState,
  ...props
}: HmsScanViewProps) {
  const callback = useRef(onScanError);
  callback.current = onScanError;
  useEffect(() => {
    callback.current?.(unsupportedScanError());
  }, []);
  return <View {...props} />;
}
