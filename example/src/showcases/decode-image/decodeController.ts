import {
  decodeImage,
  ScanError,
  type RequestedScanFormat,
  type ScannerImage,
} from '@unif/react-native-hms-scan';
import {
  decodeReducer,
  initialDecodeState,
  toDecodeSnapshot,
  type DecodeAction,
  type DecodeError,
  type DecodeSnapshot,
  type DecodeState,
} from './decodeState';

export type DecodeDeps = {
  pickImage: () => Promise<ScannerImage | null>;
};

export type DecodeController = {
  pickAndDecode: (formats?: readonly RequestedScanFormat[]) => Promise<void>;
  getSnapshot: () => DecodeSnapshot;
  subscribe: (listener: () => void) => () => void;
};

function toDecodeError(error: unknown): DecodeError {
  if (error instanceof ScanError) {
    return {
      kind: 'hms',
      reason: error.reason,
      message: error.message,
    };
  }

  return {
    kind: 'unexpected',
    message: error instanceof Error ? error.message : '选择或识别图片失败',
  };
}

export function createDecodeController(deps: DecodeDeps): DecodeController {
  let state: DecodeState = initialDecodeState;
  let snapshot = toDecodeSnapshot(state);
  let nextToken = state.activeToken;
  const listeners = new Set<() => void>();

  const dispatch = (action: DecodeAction) => {
    const nextState = decodeReducer(state, action);
    if (nextState === state) return;

    state = nextState;
    snapshot = toDecodeSnapshot(state);
    listeners.forEach((listener) => listener());
  };

  const pickAndDecode = async (formats?: readonly RequestedScanFormat[]) => {
    const token = ++nextToken;
    dispatch({ type: 'pickStarted', token });

    try {
      const image = await deps.pickImage();
      if (token !== state.activeToken) {
        image?.onSourceReleased?.();
        return;
      }

      if (image === null) {
        dispatch({ type: 'pickCancelled', token });
        return;
      }

      const { uri } = image;
      dispatch({ type: 'decodeStarted', token, uri });
      let results;
      try {
        results = await decodeImage({ uri, formats });
      } finally {
        image.onSourceReleased?.();
      }

      dispatch({
        type: 'decodeCompleted',
        token,
        results,
      });
    } catch (error) {
      dispatch({
        type: 'decodeFailed',
        token,
        error: toDecodeError(error),
      });
    }
  };

  return {
    pickAndDecode,
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
