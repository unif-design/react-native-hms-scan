import { ScanError } from '@unif/react-native-hms-scan';
import type {
  ScanCameraPermission,
  ScanFailure,
} from '@unif/react-native-hms-scan';
import {
  headlessReducer,
  initialHeadlessState,
  toHeadlessSnapshot,
  type HeadlessAction,
  type HeadlessSnapshot,
  type HeadlessState,
} from './headlessState';

export type HeadlessDeps = {
  getStatus: () => Promise<ScanCameraPermission>;
  request: () => Promise<ScanCameraPermission>;
  openSettings: () => Promise<void>;
};

export type HeadlessController = {
  getSnapshot: () => HeadlessSnapshot;
  subscribe: (listener: () => void) => () => void;
  dispatch: (action: HeadlessAction) => void;
  check: () => Promise<void>;
  request: () => Promise<void>;
  openSettings: () => Promise<void>;
  onAppActive: () => Promise<void>;
};

function toScanFailure(error: unknown, fallbackMessage: string): ScanFailure {
  if (error instanceof ScanError) return error;
  return {
    reason: 'unavailable',
    message: error instanceof Error ? error.message : fallbackMessage,
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

  const check = async () => {
    waitingForSettings = false;
    const token = ++operationToken;
    dispatch({ type: 'permissionChecking' });

    try {
      const status = await deps.getStatus();
      if (token !== operationToken) return;
      dispatch({ type: 'permissionChecked', status });
    } catch (error) {
      if (token !== operationToken) return;
      dispatch({
        type: 'permissionError',
        error: toScanFailure(error, '检查相机权限失败'),
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
        error: toScanFailure(error, '申请相机权限失败'),
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
        error: toScanFailure(error, '打开系统设置失败'),
      });
    }
  };

  const onAppActive = async () => {
    if (!waitingForSettings) return;

    waitingForSettings = false;
    await check();
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
