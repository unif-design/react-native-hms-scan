import type {
  HmsScanErrorCode,
  ScanResult,
} from '@unif/react-native-hms-scan';

export type DecodePhase =
  | 'idle'
  | 'picking'
  | 'decoding'
  | 'empty'
  | 'success'
  | 'error';

export type DecodeError =
  | { kind: 'hms'; code: HmsScanErrorCode; message: string }
  | { kind: 'unexpected'; message: string };

export type DecodeState = {
  phase: DecodePhase;
  selectedUri: string | null;
  results: readonly ScanResult[];
  error: DecodeError | null;
  activeToken: number;
};

export type DecodeSnapshot = DecodeState & {
  canStart: boolean;
};

export type DecodeAction =
  | { type: 'pickStarted'; token: number }
  | { type: 'pickCancelled'; token: number }
  | { type: 'decodeStarted'; token: number; uri: string }
  | {
      type: 'decodeCompleted';
      token: number;
      results: readonly ScanResult[];
    }
  | { type: 'decodeFailed'; token: number; error: DecodeError };

export const initialDecodeState: DecodeState = {
  phase: 'idle',
  selectedUri: null,
  results: [],
  error: null,
  activeToken: 0,
};

export function decodeReducer(
  state: DecodeState,
  action: DecodeAction
): DecodeState {
  if (action.type === 'pickStarted') {
    if (action.token <= state.activeToken) return state;

    return {
      phase: 'picking',
      selectedUri: null,
      results: [],
      error: null,
      activeToken: action.token,
    };
  }

  if (action.token !== state.activeToken) return state;

  switch (action.type) {
    case 'pickCancelled':
      return {
        ...state,
        phase: 'idle',
      };
    case 'decodeStarted':
      return {
        ...state,
        phase: 'decoding',
        selectedUri: action.uri,
      };
    case 'decodeCompleted':
      return {
        ...state,
        phase: action.results.length === 0 ? 'empty' : 'success',
        results: action.results,
        error: null,
      };
    case 'decodeFailed':
      return {
        ...state,
        phase: 'error',
        results: [],
        error: action.error,
      };
  }
}

export function toDecodeSnapshot(
  state: DecodeState
): DecodeSnapshot {
  return {
    ...state,
    canStart:
      state.phase !== 'picking' && state.phase !== 'decoding',
  };
}
