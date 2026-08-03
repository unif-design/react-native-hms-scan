import type {
  CameraPermissionStatus,
  ScanError,
} from '@unif/react-native-hms-scan';
import {
  headlessReducer,
  initialHeadlessState,
  toHeadlessSnapshot,
  type HeadlessAction,
  type HeadlessPlatform,
  type HeadlessSnapshot,
  type HeadlessState,
} from './headlessState';

export type HeadlessDeps = {
  getStatus: () => Promise<CameraPermissionStatus>;
  request: () => Promise<CameraPermissionStatus>;
  openSettings: () => Promise<void>;
};

export type HeadlessController = {
  getSnapshot: () => HeadlessSnapshot;
  subscribe: (listener: () => void) => () => void;
  dispatch: (action: HeadlessAction) => void;
  check: (os: HeadlessPlatform) => Promise<void>;
  request: () => Promise<void>;
  openSettings: () => Promise<void>;
  onAppActive: (os: HeadlessPlatform) => Promise<void>;
};

function toScanError(error: unknown, fallbackMessage: string): ScanError {
  if (typeof error === 'object' && error !== null) {
    const code =
      'code' in error && typeof error.code === 'string'
        ? error.code
        : 'E_UNKNOWN';
    const message =
      'message' in error && typeof error.message === 'string'
        ? error.message
        : fallbackMessage;
    return { code, message };
  }

  return {
    code: 'E_UNKNOWN',
    message: typeof error === 'string' ? error : fallbackMessage,
  };
}

export function createHeadlessController(
  deps: HeadlessDeps
): HeadlessController {
  let state: HeadlessState = initialHeadlessState;
  let snapshot = toHeadlessSnapshot(state);
  let operationToken = 0;
  let waitingForSettings = false;
  const listeners = new Set<() => void>();

  const dispatch = (action: HeadlessAction) => {
    const nextState = headlessReducer(state, action);
    if (nextState === state) return;

    state = nextState;
    snapshot = toHeadlessSnapshot(state);
    listeners.forEach((listener) => listener());
  };

  const check = async (os: HeadlessPlatform) => {
    waitingForSettings = false;
    const token = ++operationToken;
    dispatch({ type: 'permissionChecking' });

    try {
      const status = await deps.getStatus();
      if (token !== operationToken) return;
      dispatch({ type: 'permissionChecked', status, os });
    } catch (error) {
      if (token !== operationToken) return;
      dispatch({
        type: 'permissionError',
        error: toScanError(error, '检查相机权限失败'),
      });
    }
  };

  const request = async () => {
    waitingForSettings = false;
    const token = ++operationToken;
    dispatch({ type: 'permissionRequesting' });

    try {
      const status = await deps.request();
      if (token !== operationToken) return;
      dispatch({ type: 'permissionRequested', status });
    } catch (error) {
      if (token !== operationToken) return;
      dispatch({
        type: 'permissionError',
        error: toScanError(error, '申请相机权限失败'),
      });
    }
  };

  const openSettings = async () => {
    const token = ++operationToken;
    waitingForSettings = true;

    try {
      await deps.openSettings();
    } catch (error) {
      if (token !== operationToken) return;
      waitingForSettings = false;
      dispatch({
        type: 'permissionError',
        error: toScanError(error, '打开系统设置失败'),
      });
    }
  };

  const onAppActive = async (os: HeadlessPlatform) => {
    if (!waitingForSettings) return;

    waitingForSettings = false;
    await check(os);
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatch,
    check,
    request,
    openSettings,
    onAppActive,
  };
}
