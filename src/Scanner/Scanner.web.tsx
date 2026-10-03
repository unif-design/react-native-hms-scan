import { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { unsupportedScanError } from '../errors';
import type { ScannerProps } from './types';

export function Scanner({ onError, onClose }: ScannerProps) {
  const callback = useRef(onError);
  callback.current = onError;
  useEffect(() => {
    callback.current?.(unsupportedScanError());
  }, []);
  return (
    <View>
      <Text>HMS Scan 仅支持 Android 与 iOS 设备</Text>
      {onClose && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回"
          onPress={onClose}
        >
          <Text>返回</Text>
        </Pressable>
      )}
    </View>
  );
}
