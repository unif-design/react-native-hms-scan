import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  decodeImage,
  getCameraPermissionStatus,
  requestCameraPermission,
  HmsScanView,
} from '@unif/react-native-hms-scan';
import NativeHmsScan from '../NativeHmsScan';

jest.mock('../NativeHmsScan', () => ({
  __esModule: true,
  default: {
    decodeImage: jest.fn(async () => '[]'),
    getCameraPermissionStatus: jest.fn(async () => 'granted'),
    requestCameraPermission: jest.fn(async () => 'granted'),
  },
}));
jest.mock('../HmsScanViewNativeComponent', () => ({
  __esModule: true,
  default: require('react-native').View,
}));
const native = jest.mocked(NativeHmsScan)!;
beforeEach(() => jest.clearAllMocks());

test('decodeImage preserves the file and full batch without requesting camera permission', async () => {
  native.decodeImage.mockResolvedValueOnce(
    '[{"value":" 001 ","format":"EAN_13"},{"value":"text","format":"NEW"}]'
  );
  await expect(
    decodeImage({ uri: 'file:///tmp/test.jpg', formats: ['EAN_13'] })
  ).resolves.toEqual([
    { value: ' 001 ', format: 'EAN_13' },
    { value: 'text', format: 'UNKNOWN' },
  ]);
  expect(native.decodeImage).toHaveBeenCalledWith(
    'file:///tmp/test.jpg',
    'EAN_13'
  );
  expect(native.requestCameraPermission).not.toHaveBeenCalled();
});
test.each([
  '',
  '/tmp/test.jpg',
  'content://photo/1',
  'https://example.com/a.png',
  'file://remote/a',
  'file:///',
])('invalid URI %s does not start native reading', async (uri) => {
  await expect(decodeImage({ uri })).rejects.toMatchObject({
    reason: 'invalid_input',
  });
  expect(native.decodeImage).not.toHaveBeenCalled();
});
test.each([
  'oops',
  '{}',
  '[null]',
  '[{"value":1}]',
  '[{"format":"QR_CODE"}]',
  '[{"value":"text"}]',
  '[{"value":"text","format":42}]',
])('invalid bridge response %s is an error', async (json) => {
  native.decodeImage.mockResolvedValueOnce(json);
  await expect(decodeImage({ uri: 'file:///tmp/a' })).rejects.toMatchObject({
    reason: 'invalid_response',
  });
});
test('real empty results remain empty and missing optional fields retain valid text', async () => {
  native.decodeImage.mockResolvedValueOnce('[]');
  await expect(decodeImage({ uri: 'file:///tmp/a' })).resolves.toEqual([]);
  native.decodeImage.mockResolvedValueOnce(
    '[{"value":"","format":"NEW","contentType":"NEW","cornerPoints":[{"x":"bad","y":2}]}]'
  );
  await expect(decodeImage({ uri: 'file:///tmp/a' })).resolves.toEqual([
    { value: '', format: 'UNKNOWN' },
  ]);
});
test('native failures are stable errors with their source code', async () => {
  native.decodeImage.mockRejectedValueOnce({
    code: 'E_IMAGE_LOAD_FAILED',
    message: 'gone',
  });
  await expect(decodeImage({ uri: 'file:///tmp/a' })).rejects.toMatchObject({
    name: 'ScanError',
    reason: 'image_unavailable',
    message: 'gone',
    sourceCode: 'E_IMAGE_LOAD_FAILED',
  });
});
test('permission read is independent; an unknown status never turns into an automatic request', async () => {
  native.getCameraPermissionStatus.mockResolvedValueOnce('new-status');
  await expect(getCameraPermissionStatus()).rejects.toMatchObject({
    reason: 'invalid_response',
  });
  expect(native.requestCameraPermission).not.toHaveBeenCalled();
  native.requestCameraPermission.mockResolvedValueOnce('blocked');
  await expect(requestCameraPermission()).resolves.toBe('blocked');
});
test('real-time results and malformed responses use the same boundary as image decoding', () => {
  const onScanResult = jest.fn();
  const onScanError = jest.fn();
  render(
    <HmsScanView
      testID="camera"
      onScanResult={onScanResult}
      onScanError={onScanError}
    />
  );
  fireEvent(screen.getByTestId('camera'), 'scanResult', {
    nativeEvent: { resultsJson: '[{"value":"001","format":"NEW"}]' },
  });
  expect(onScanResult).toHaveBeenCalledWith([
    { value: '001', format: 'UNKNOWN' },
  ]);
  fireEvent(screen.getByTestId('camera'), 'scanResult', {
    nativeEvent: { resultsJson: '{}' },
  });
  expect(onScanError).toHaveBeenCalledWith(
    expect.objectContaining({ reason: 'invalid_response' })
  );
  expect(onScanResult).toHaveBeenCalledTimes(1);
});

test('format input is validated and normalized without changing result formats', async () => {
  native.decodeImage.mockResolvedValueOnce('[]');
  await decodeImage({
    uri: 'file:///tmp/a',
    formats: ['QR_CODE', 'EAN_13', 'QR_CODE'],
  });
  expect(native.decodeImage).toHaveBeenCalledWith(
    'file:///tmp/a',
    'EAN_13,QR_CODE'
  );
  native.decodeImage.mockClear();
  await expect(
    decodeImage({ uri: 'file:///tmp/a', formats: ['UNKNOWN'] as never })
  ).rejects.toMatchObject({ reason: 'invalid_input' });
  expect(native.decodeImage).not.toHaveBeenCalled();
});
test('a sparse format array is invalid input on both platforms', async () => {
  const formats = new Array(2);
  formats[1] = 'QR_CODE';
  await expect(
    decodeImage({ uri: 'file:///tmp/a', formats })
  ).rejects.toMatchObject({ reason: 'invalid_input' });
  expect(native.decodeImage).not.toHaveBeenCalled();
});
test('torch hardware and low-light fields stay distinct and absent when unknown', () => {
  const onTorchState = jest.fn();
  render(<HmsScanView testID="camera" onTorchState={onTorchState} />);
  fireEvent(screen.getByTestId('camera'), 'torchState', {
    nativeEvent: {
      on: false,
      available: true,
      hasAvailable: true,
      lowLight: true,
      hasLowLight: false,
    },
  });
  expect(onTorchState).toHaveBeenLastCalledWith({ on: false, available: true });
  fireEvent(screen.getByTestId('camera'), 'torchState', {
    nativeEvent: {
      on: true,
      available: false,
      hasAvailable: false,
      lowLight: true,
      hasLowLight: true,
    },
  });
  expect(onTorchState).toHaveBeenLastCalledWith({ on: true, lowLight: true });
});
test('permission read failures are errors rather than denied', async () => {
  native.getCameraPermissionStatus.mockRejectedValueOnce({
    code: 'E_NO_ACTIVITY',
    message: 'no activity',
  });
  await expect(getCameraPermissionStatus()).rejects.toMatchObject({
    reason: 'unavailable',
    sourceCode: 'E_NO_ACTIVITY',
  });
});
