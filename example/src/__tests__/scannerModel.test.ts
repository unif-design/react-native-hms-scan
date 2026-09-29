import type { ScanFailure, ScanResult } from '@unif/react-native-hms-scan';
import { formatsForPreset } from '../shared/formatPresets';
import {
  initialScannerDemoState,
  scannerDemoReducer,
} from '../showcases/scanner/scannerModel';

const milkTeaResult: ScanResult = {
  value: '6925303773908',
  format: 'EAN_13',
  contentType: 'OTHER',
  cornerPoints: [
    { x: 12, y: 24 },
    { x: 212, y: 24 },
    { x: 212, y: 88 },
    { x: 12, y: 88 },
  ],
};

describe('format presets', () => {
  it('全部码制通过 undefined 交给 Scanner', () => {
    expect(formatsForPreset('all')).toBeUndefined();
  });

  it('二维码预设只启用 QR_CODE', () => {
    expect(formatsForPreset('qr')).toEqual(['QR_CODE']);
  });

  it('商品条码预设启用约定的零售码制', () => {
    expect(formatsForPreset('retail')).toEqual([
      'EAN_8',
      'EAN_13',
      'UPC_A',
      'UPC_E',
      'CODE_128',
    ]);
  });
});

describe('scannerDemoReducer', () => {
  it('更新 Scanner 的 format preset', () => {
    expect(
      scannerDemoReducer(initialScannerDemoState, {
        type: 'setPreset',
        preset: 'retail',
      })
    ).toEqual({
      ...initialScannerDemoState,
      preset: 'retail',
    });
  });

  it('更新 autoConfirm 配置', () => {
    expect(
      scannerDemoReducer(initialScannerDemoState, {
        type: 'setAutoConfirm',
        autoConfirm: true,
      })
    ).toEqual({
      ...initialScannerDemoState,
      autoConfirm: true,
    });
  });

  it('enter 挂载新的 Scanner 实例', () => {
    expect(
      scannerDemoReducer(initialScannerDemoState, {
        type: 'enter',
      }).active
    ).toBe(true);
  });

  it('close 卸载 Scanner 实例', () => {
    const activeState = scannerDemoReducer(initialScannerDemoState, {
      type: 'enter',
    });

    expect(scannerDemoReducer(activeState, { type: 'close' }).active).toBe(
      false
    );
  });

  it('confirmed 同步保存完整结果并退出 Scanner', () => {
    const activeState = {
      ...initialScannerDemoState,
      active: true,
    };

    expect(
      scannerDemoReducer(activeState, {
        type: 'confirmed',
        result: milkTeaResult,
      })
    ).toMatchObject({
      active: false,
      lastConfirmed: milkTeaResult,
    });
  });

  it('保存 Scanner 回调提供的普通 ScanFailure', () => {
    const error: ScanFailure = {
      reason: 'unavailable',
      message: '相机初始化失败',
    };

    expect(
      scannerDemoReducer(initialScannerDemoState, {
        type: 'error',
        error,
      })
    ).toEqual({
      ...initialScannerDemoState,
      lastError: error,
    });
  });

  it('E_NO_RESULT 只保存为 soft feedback 而不中断扫码', () => {
    const activeState = {
      ...initialScannerDemoState,
      active: true,
    };
    const error: ScanFailure = {
      reason: 'invalid_response',
      message: '未识别到条码',
    };

    expect(
      scannerDemoReducer(activeState, {
        type: 'error',
        error,
      })
    ).toEqual({
      ...activeState,
      lastError: error,
    });
  });
});
