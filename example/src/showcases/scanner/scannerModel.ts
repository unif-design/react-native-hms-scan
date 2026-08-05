import type {
  ScanError,
  ScanProduct,
  ScanResult,
} from '@unif/react-native-hms-scan';
import type { FormatPresetId } from '../../shared/formatPresets';

export type ScannerDemoState = {
  active: boolean;
  preset: FormatPresetId;
  autoConfirm: boolean;
  lastConfirmed: { product: ScanProduct; result: ScanResult } | null;
  lastError: ScanError | null;
};

export const initialScannerDemoState: ScannerDemoState = {
  active: false,
  preset: 'all',
  autoConfirm: false,
  lastConfirmed: null,
  lastError: null,
};

type ScannerDemoAction =
  | { type: 'setPreset'; preset: FormatPresetId }
  | { type: 'setAutoConfirm'; autoConfirm: boolean }
  | { type: 'enter' }
  | { type: 'close' }
  | { type: 'confirmed'; product: ScanProduct; result: ScanResult }
  | { type: 'error'; error: ScanError };

export function scannerDemoReducer(
  state: ScannerDemoState,
  action: ScannerDemoAction
): ScannerDemoState {
  switch (action.type) {
    case 'setPreset':
      return { ...state, preset: action.preset };
    case 'setAutoConfirm':
      return { ...state, autoConfirm: action.autoConfirm };
    case 'enter':
      return { ...state, active: true };
    case 'close':
      return { ...state, active: false };
    case 'confirmed':
      return {
        ...state,
        active: false,
        lastConfirmed: {
          product: action.product,
          result: action.result,
        },
      };
    case 'error':
      return { ...state, lastError: action.error };
  }
}
