import {
  decodeImage,
  HmsScanError,
  type BarcodeFormat,
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
  pickImage: () => Promise<string | null>;
};

export type DecodeController = {
  pickAndDecode: (
    formats?: readonly BarcodeFormat[]
  ) => Promise<void>;
  getSnapshot: () => DecodeSnapshot;
  subscribe: (listener: () => void) => () => void;
};

function toDecodeError(error: unknown): DecodeError {
  if (error instanceof HmsScanError) {
    return {
      kind: 'hms',
      code: error.code,
      message: error.message,
    };
  }

  return {
    kind: 'unexpected',
    message:
      error instanceof Error
        ? error.message
        : '选择或识别图片失败',
  };
}

export function createDecodeController(
  deps: DecodeDeps
): DecodeController {
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

  const pickAndDecode = async (
    formats?: readonly BarcodeFormat[]
  ) => {
    const token = ++nextToken;
    dispatch({ type: 'pickStarted', token });

    try {
      const uri = await deps.pickImage();
      if (token !== state.activeToken) return;

      if (uri === null) {
        dispatch({ type: 'pickCancelled', token });
        return;
      }

      dispatch({ type: 'decodeStarted', token, uri });
      const results =
        formats === undefined
          ? await decodeImage(uri)
          : await decodeImage(uri, { formats });

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
