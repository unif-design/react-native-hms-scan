import type {
  CameraPermissionStatus,
  ScanError,
  ScanResult,
  TorchStatus,
} from '@unif/react-native-hms-scan';

export type PermissionPhase =
  | 'checking'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'error';

export type HeadlessPlatform = 'android' | 'ios';

export type HeadlessState = {
  permission: PermissionPhase;
  nativePermission: CameraPermissionStatus | null;
  paused: boolean;
  continuous: boolean;
  torchRequested: boolean;
  torchStatus: TorchStatus;
  results: readonly ScanResult[];
  error: ScanError | null;
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
      status: CameraPermissionStatus;
      os: HeadlessPlatform;
    }
  | { type: 'permissionRequested'; status: CameraPermissionStatus }
  | { type: 'permissionError'; error: ScanError }
  | { type: 'setPaused'; paused: boolean }
  | { type: 'setContinuous'; continuous: boolean }
  | { type: 'setTorchRequested'; torchRequested: boolean }
  | { type: 'torchStatus'; status: TorchStatus }
  | { type: 'scanResults'; results: readonly ScanResult[] }
  | { type: 'scanError'; error: ScanError }
  | { type: 'retry' };

export const initialHeadlessState: HeadlessState = {
  permission: 'checking',
  nativePermission: null,
  paused: false,
  continuous: false,
  torchRequested: false,
  torchStatus: {
    available: false,
    on: false,
  },
  results: [],
  error: null,
  needsPermissionRecheck: false,
  viewGeneration: 0,
};

function permissionAfterCheck(
  status: CameraPermissionStatus,
  os: HeadlessPlatform
): PermissionPhase {
  if (status === 'granted') return 'granted';

  if (os === 'ios') {
    // iOS query 能区分首次可请求与已阻止；blocked 必须直接引导设置。
    return status === 'blocked' ? 'blocked' : 'denied';
  }

  // Android query 不区分 denied/blocked，blocked 只采信 request 的结果。
  return 'denied';
}

function permissionAfterRequest(
  status: CameraPermissionStatus
): PermissionPhase {
  if (status === 'granted') return 'granted';
  if (status === 'blocked') return 'blocked';
  return 'denied';
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
      const permission = permissionAfterCheck(action.status, action.os);
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
      const permission = permissionAfterRequest(action.status);
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
      if (action.error.code === 'E_NO_RESULT') {
        return { ...state, error: action.error };
      }
      if (action.error.code === 'E_NO_CAMERA_PERMISSION') {
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
        viewGeneration:
          state.error && state.error.code !== 'E_NO_RESULT'
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
