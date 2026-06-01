/// <reference types="jest" />

import {
  decodeImage,
  getCameraPermissionStatus,
  requestCameraPermission,
  HmsScanView,
  Scanner,
  HmsScanError,
  ALL_BARCODE_FORMATS,
  coerceFormat,
} from '../mock';

describe('mock 入口', () => {
  it('decodeImage 默认 resolve 空数组，且可覆盖', async () => {
    await expect(decodeImage('file://x.jpg')).resolves.toEqual([]);
    (decodeImage as jest.Mock).mockResolvedValueOnce([
      { value: '690', format: 'EAN_13' },
    ]);
    await expect(decodeImage('file://x.jpg')).resolves.toEqual([
      { value: '690', format: 'EAN_13' },
    ]);
  });

  it('权限默认 granted', async () => {
    await expect(getCameraPermissionStatus()).resolves.toBe('granted');
    await expect(requestCameraPermission()).resolves.toBe('granted');
  });

  it('组件是渲染 null 的占位', () => {
    expect(HmsScanView({})).toBeNull();
    expect(Scanner({})).toBeNull();
  });

  it('纯 JS 部分（类型/常量/Error/工具）保留真实实现', () => {
    expect(ALL_BARCODE_FORMATS).toContain('QR_CODE');
    expect(coerceFormat('QR_CODE')).toBe('QR_CODE');
    const err = new HmsScanError('E_NO_RESULT', 'x');
    expect(err).toBeInstanceOf(HmsScanError);
    expect(err.code).toBe('E_NO_RESULT');
  });
});
