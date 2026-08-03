import type { ScanResult } from '@unif/react-native-hms-scan';
import {
  decodeReducer,
  initialDecodeState,
  type DecodeState,
} from '../showcases/decode-image/decodeState';

const qrResult: ScanResult = {
  value: 'https://unif.example/scan',
  format: 'QR_CODE',
  contentType: 'URL',
  cornerPoints: [
    { x: 12, y: 24 },
    { x: 212, y: 24 },
    { x: 212, y: 88 },
    { x: 12, y: 88 },
  ],
};

const eanResult: ScanResult = {
  value: '6925303773908',
  format: 'EAN_13',
  contentType: 'OTHER',
  cornerPoints: [
    { x: 20, y: 30 },
    { x: 180, y: 30 },
    { x: 180, y: 90 },
    { x: 20, y: 90 },
  ],
};

describe('decodeReducer lifecycle', () => {
  it('从 picking 进入 decoding，并保存选择器返回的 URI', () => {
    const picking = decodeReducer(initialDecodeState, {
      type: 'pickStarted',
      token: 1,
    });
    const decoding = decodeReducer(picking, {
      type: 'decodeStarted',
      token: 1,
      uri: 'file:///qr.png',
    });

    expect(picking).toEqual({
      phase: 'picking',
      selectedUri: null,
      results: [],
      error: null,
      activeToken: 1,
    });
    expect(decoding).toEqual({
      ...picking,
      phase: 'decoding',
      selectedUri: 'file:///qr.png',
    });
  });

  it('取消选择回到 idle，空结果进入正常 empty 状态', () => {
    const picking = decodeReducer(initialDecodeState, {
      type: 'pickStarted',
      token: 1,
    });
    const cancelled = decodeReducer(picking, {
      type: 'pickCancelled',
      token: 1,
    });
    const nextPicking = decodeReducer(cancelled, {
      type: 'pickStarted',
      token: 2,
    });
    const decoding = decodeReducer(nextPicking, {
      type: 'decodeStarted',
      token: 2,
      uri: 'file:///empty.png',
    });

    expect(cancelled).toEqual({
      ...picking,
      phase: 'idle',
    });
    expect(
      decodeReducer(decoding, {
        type: 'decodeCompleted',
        token: 2,
        results: [],
      })
    ).toEqual({
      ...decoding,
      phase: 'empty',
      results: [],
    });
  });

  it('成功态完整保存 decodeImage 返回的全部结果', () => {
    const decoding: DecodeState = {
      ...initialDecodeState,
      phase: 'decoding',
      selectedUri: 'file:///mixed.png',
      activeToken: 4,
    };

    expect(
      decodeReducer(decoding, {
        type: 'decodeCompleted',
        token: 4,
        results: [qrResult, eanResult],
      })
    ).toEqual({
      ...decoding,
      phase: 'success',
      results: [qrResult, eanResult],
    });
  });

  it('忽略旧 token 的完成与失败 action', () => {
    const current: DecodeState = {
      ...initialDecodeState,
      phase: 'decoding',
      selectedUri: 'file:///new.png',
      activeToken: 2,
    };

    expect(
      decodeReducer(current, {
        type: 'decodeCompleted',
        token: 1,
        results: [qrResult],
      })
    ).toBe(current);
    expect(
      decodeReducer(current, {
        type: 'decodeFailed',
        token: 1,
        error: {
          kind: 'unexpected',
          message: 'old operation failed',
        },
      })
    ).toBe(current);
  });

  it('当前 token 失败时进入 error 并清空旧结果', () => {
    const decoding: DecodeState = {
      ...initialDecodeState,
      phase: 'decoding',
      selectedUri: 'file:///broken.png',
      results: [qrResult],
      activeToken: 3,
    };

    expect(
      decodeReducer(decoding, {
        type: 'decodeFailed',
        token: 3,
        error: {
          kind: 'hms',
          code: 'E_IMAGE_LOAD_FAILED',
          message: 'load failed',
        },
      })
    ).toEqual({
      ...decoding,
      phase: 'error',
      results: [],
      error: {
        kind: 'hms',
        code: 'E_IMAGE_LOAD_FAILED',
        message: 'load failed',
      },
    });
  });
});
