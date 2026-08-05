import type {
  ScanError,
  ScanResult,
  TorchStatus,
} from '@unif/react-native-hms-scan';
import {
  headlessReducer,
  initialHeadlessState,
  type HeadlessState,
} from '../showcases/headless/headlessState';

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

const grantedState: HeadlessState = {
  ...initialHeadlessState,
  permission: 'granted',
  nativePermission: 'granted',
};

describe('headlessReducer permissions', () => {
  it('将 iOS undetermined 映射为可请求态并保留原生状态', () => {
    expect(
      headlessReducer(initialHeadlessState, {
        type: 'permissionChecked',
        status: 'undetermined',
        os: 'ios',
      })
    ).toEqual({
      ...initialHeadlessState,
      permission: 'denied',
      nativePermission: 'undetermined',
    });
  });

  it('iOS query 保留 blocked，直接进入设置恢复态', () => {
    const checked = headlessReducer(initialHeadlessState, {
      type: 'permissionChecked',
      status: 'blocked',
      os: 'ios',
    });

    expect(checked.permission).toBe('blocked');
    expect(checked.nativePermission).toBe('blocked');
  });

  it('Android query 即使收到 blocked 也保持可请求 denied', () => {
    const checked = headlessReducer(initialHeadlessState, {
      type: 'permissionChecked',
      status: 'blocked',
      os: 'android',
    });

    expect(checked.permission).toBe('denied');
    expect(checked.nativePermission).toBe('blocked');
  });

  it('request blocked 进入设置恢复态', () => {
    const requested = headlessReducer(initialHeadlessState, {
      type: 'permissionRequested',
      status: 'blocked',
    });

    expect(requested.permission).toBe('blocked');
    expect(requested.nativePermission).toBe('blocked');
  });

  it('Android query denied 进入可请求态', () => {
    expect(
      headlessReducer(initialHeadlessState, {
        type: 'permissionChecked',
        status: 'denied',
        os: 'android',
      }).permission
    ).toBe('denied');
  });

  it('granted 权限允许进入预览状态并清除旧错误', () => {
    const previous: HeadlessState = {
      ...initialHeadlessState,
      permission: 'error',
      error: { code: 'E_NO_ACTIVITY', message: 'no activity' },
      paused: true,
      needsPermissionRecheck: true,
    };

    expect(
      headlessReducer(previous, {
        type: 'permissionChecked',
        status: 'granted',
        os: 'android',
      })
    ).toEqual({
      ...previous,
      permission: 'granted',
      nativePermission: 'granted',
      paused: false,
      error: null,
      needsPermissionRecheck: false,
    });
  });
});

describe('headlessReducer controls and results', () => {
  it('独立保存手电请求值与原生实际状态', () => {
    const requested = headlessReducer(grantedState, {
      type: 'setTorchRequested',
      torchRequested: true,
    });
    const actualStatus: TorchStatus = { available: true, on: false };
    const reported = headlessReducer(requested, {
      type: 'torchStatus',
      status: actualStatus,
    });

    expect(reported.torchRequested).toBe(true);
    expect(reported.torchStatus).toEqual({
      available: true,
      on: false,
    });
  });

  it('非 continuous 扫描按 format:value 去重、新结果在前并暂停', () => {
    const scanned = headlessReducer(grantedState, {
      type: 'scanResults',
      results: [qrResult, qrResult, eanResult],
    });

    expect(
      scanned.results.map((item) => `${item.format}:${item.value}`)
    ).toEqual(['EAN_13:6925303773908', 'QR_CODE:https://unif.example/scan']);
    expect(scanned.results).toEqual([eanResult, qrResult]);
    expect(scanned.paused).toBe(true);
  });

  it('continuous 扫描命中后保持运行', () => {
    const continuousState = headlessReducer(grantedState, {
      type: 'setContinuous',
      continuous: true,
    });

    expect(
      headlessReducer(continuousState, {
        type: 'scanResults',
        results: [qrResult],
      }).paused
    ).toBe(false);
  });

  it('空结果不改变历史结果或暂停状态', () => {
    const previous: HeadlessState = {
      ...grantedState,
      results: [qrResult],
    };

    expect(
      headlessReducer(previous, { type: 'scanResults', results: [] })
    ).toBe(previous);
  });

  it('刷新重复结果并把历史列表限制为最近 20 条', () => {
    const previousResults: readonly ScanResult[] = Array.from(
      { length: 20 },
      (_, index) => ({
        value: `old-${index + 1}`,
        format: 'CODE_128',
        contentType: 'TEXT',
      })
    );
    const previous: HeadlessState = {
      ...grantedState,
      continuous: true,
      results: previousResults,
    };
    const newest: ScanResult = {
      value: 'newest',
      format: 'QR_CODE',
      contentType: 'URL',
    };

    const scanned = headlessReducer(previous, {
      type: 'scanResults',
      results: [newest],
    });

    expect(scanned.results).toHaveLength(20);
    expect(scanned.results[0]).toEqual(newest);
    expect(scanned.results[19]).toEqual({
      value: 'old-19',
      format: 'CODE_128',
      contentType: 'TEXT',
    });
  });

  it('不修改 frozen previous state 或历史结果数组', () => {
    const frozenResults = Object.freeze([Object.freeze({ ...qrResult })]);
    const previous = Object.freeze({
      ...grantedState,
      continuous: true,
      results: frozenResults,
    });

    const next = headlessReducer(previous, {
      type: 'scanResults',
      results: [eanResult],
    });

    expect(previous.results).toEqual([qrResult]);
    expect(next).not.toBe(previous);
    expect(next.results).toEqual([eanResult, qrResult]);
  });
});

describe('headlessReducer errors', () => {
  it('E_NO_RESULT 只保存 feedback 而不中断预览', () => {
    const error: ScanError = {
      code: 'E_NO_RESULT',
      message: '未识别到条码',
    };

    const failed = headlessReducer(grantedState, {
      type: 'scanError',
      error,
    });

    expect(failed).toEqual({
      ...grantedState,
      error,
    });
    expect(failed.viewGeneration).toBe(0);
  });

  it('E_NO_CAMERA_PERMISSION 暂停并请求权限复查', () => {
    const error: ScanError = {
      code: 'E_NO_CAMERA_PERMISSION',
      message: '相机权限已失效',
    };

    expect(headlessReducer(grantedState, { type: 'scanError', error })).toEqual(
      {
        ...grantedState,
        paused: true,
        error,
        needsPermissionRecheck: true,
      }
    );
  });

  it('普通 view error 可通过 retry 清除并恢复扫描', () => {
    const error: ScanError = {
      code: 'E_CAMERA_INIT',
      message: '相机初始化失败',
    };
    const failed = headlessReducer(grantedState, {
      type: 'scanError',
      error,
    });

    expect(failed.paused).toBe(true);
    expect(failed.error).toEqual(error);
    expect(headlessReducer(failed, { type: 'retry' })).toEqual({
      ...failed,
      paused: false,
      error: null,
      viewGeneration: 1,
    });
  });
});
