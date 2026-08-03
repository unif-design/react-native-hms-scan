/// <reference types="jest" />

import { ALL_BARCODE_FORMATS } from '../types';
import type { DecodeImageOptions, ScanError } from '../types';
import type { HmsScanViewProps } from '../HmsScanView';
import type { ScannerProps } from '../Scanner/Scanner';

const subset = ['QR_CODE', 'EAN_13'] as const;
const decodeOptions = { formats: ALL_BARCODE_FORMATS } satisfies DecodeImageOptions;
const viewProps = { formats: subset } satisfies HmsScanViewProps;
const scannerProps = { formats: subset } satisfies ScannerProps;
const scanError = { code: 'E_CAMERA_INIT', message: 'camera failed' } satisfies ScanError;

test('公开 formats 输入接受 readonly 数组', () => {
  expect(decodeOptions.formats).toBe(ALL_BARCODE_FORMATS);
  expect(viewProps.formats).toBe(subset);
  expect(scannerProps.formats).toBe(subset);
  expect(scanError.code).toBe('E_CAMERA_INIT');
});
