import { useContext } from 'react';
import {
  SafeAreaInsetsContext,
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import { ScannerInner } from './ScannerInner';
import type { ScannerProps } from './types';

/** Uses the current window's SafeAreaProvider, or measures a local one. */
export function Scanner(props: ScannerProps) {
  const insets = useContext(SafeAreaInsetsContext);
  return insets ? (
    <ScannerInner {...props} />
  ) : (
    <SafeAreaProvider>
      <ScannerInner {...props} />
    </SafeAreaProvider>
  );
}
