import type {
  ScanCameraPermission,
  ScanFailure,
  ScanResult,
  ScanTorchState,
} from '@unif/react-native-hms-scan';

export type PermissionPhase =
  | 'checking'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'error';

export type HeadlessState = {
  permission: PermissionPhase;
  nativePermission: ScanCameraPermission | null;
  paused: boolean;
  continuous: boolean;
  torchRequested: boolean;
  torchStatus: ScanTorchState;
  results: readonly ScanResult[];
  error: ScanFailure | null;
  needsPermissionRecheck: boolean;
  viewGeneration: number;
};

export type HeadlessSnapshot = HeadlessState & {
  shouldMountView: boolean;
  canRequest: boolean;
};

export type HeadlessAction =
  | { type: 'permissionChecking' }
  | { type: 'permissionRequesting' }
  | {
      type: 'permissionChecked';
      status: ScanCameraPermission;
    }
  | { type: 'permissionRequested'; status: ScanCameraPermission }
  | { type: 'permissionError'; error: ScanFailure }
  | { type: 'setPaused'; paused: boolean }
  | { type: 'setContinuous'; continuous: boolean }
  | { type: 'setTorchRequested'; torchRequested: boolean }
  | { type: 'torchStatus'; status: ScanTorchState }
  | { type: 'scanResults'; results: readonly ScanResult[] }
  | { type: 'scanError'; error: ScanFailure }
  | { type: 'retry' };

export const initialHeadlessState: HeadlessState = {
  permission: 'checking',
  nativePermission: null,
  paused: false,
  continuous: false,
  torchRequested: false,
  torchStatus: {
    on: false,
  },
  results: [],
  error: null,
  needsPermissionRecheck: false,
  viewGeneration: 0,
};

function permissionPhase(status: ScanCameraPermission): PermissionPhase {
  return status === 'undetermined' ? 'denied' : status;
}

function scanResultKey(result: ScanResult): string {
  return `${result.format}:${result.value}`;
}

function mergeScanResults(
  previous: readonly ScanResult[],
  incoming: readonly ScanResult[]
): readonly ScanResult[] {
  let merged = [...previous];

  for (const result of incoming) {
    const key = scanResultKey(result);
    merged = [result, ...merged.filter((item) => scanResultKey(item) !== key)];
  }

  return merged.slice(0, 20);
}

export function headlessReducer(
  state: HeadlessState,
  action: HeadlessAction
): HeadlessState {
  switch (action.type) {
    case 'permissionChecking':
      return {
        ...state,
        permission: 'checking',
        viewGeneration: state.error
          ? state.viewGeneration + 1
          : state.viewGeneration,
        error: null,
        needsPermissionRecheck: false,
      };
    case 'permissionRequesting':
      return {
        ...state,
        permission: 'requesting',
        error: null,
        needsPermissionRecheck: false,
      };
    case 'permissionChecked': {
      const permission = permissionPhase(action.status);
      return {
        ...state,
        permission,
        nativePermission: action.status,
        paused: permission === 'granted' ? false : state.paused,
        error: null,
        needsPermissionRecheck: false,
      };
    }
    case 'permissionRequested': {
      const permission = permissionPhase(action.status);
      return {
        ...state,
        permission,
        nativePermission: action.status,
        paused: permission === 'granted' ? false : state.paused,
        error: null,
        needsPermissionRecheck: false,
      };
    }
    case 'permissionError':
      return {
        ...state,
        permission: 'error',
        paused: true,
        error: action.error,
        needsPermissionRecheck: false,
      };
    case 'setPaused':
      return { ...state, paused: action.paused };
    case 'setContinuous':
      return { ...state, continuous: action.continuous };
    case 'setTorchRequested':
      return { ...state, torchRequested: action.torchRequested };
    case 'torchStatus':
      return { ...state, torchStatus: action.status };
    case 'scanResults':
      if (action.results.length === 0) return state;
      return {
        ...state,
        paused: state.continuous ? state.paused : true,
        results: mergeScanResults(state.results, action.results),
        error: null,
      };
    case 'scanError':
      if (action.error.reason === 'permission_denied') {
        return {
          ...state,
          paused: true,
          error: action.error,
          needsPermissionRecheck: true,
        };
      }
      return {
        ...state,
        paused: true,
        error: action.error,
      };
    case 'retry':
      return {
        ...state,
        paused: false,
        error: null,
        viewGeneration: state.error
          ? state.viewGeneration + 1
          : state.viewGeneration,
      };
  }
}

export function toHeadlessSnapshot(state: HeadlessState): HeadlessSnapshot {
  return {
    ...state,
    shouldMountView:
      state.permission === 'granted' && !state.needsPermissionRecheck,
    canRequest: state.permission === 'denied',
  };
}
