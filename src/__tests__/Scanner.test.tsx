import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState, Linking, type AppStateStatus } from 'react-native';
import { Scanner, type ScannerImage } from '@unif/react-native-hms-scan';
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
  default: (props: Record<string, unknown>) => {
    const React = require('react');
    return React.createElement(require('react-native').View, {
      ...props,
      testID: 'camera',
    });
  },
}));
const native = jest.mocked(NativeHmsScan)!;
const first = { value: '001 original', format: 'QR_CODE' };
const batch = JSON.stringify([first, { value: 'second', format: 'EAN_13' }]);
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
let appState: ((state: AppStateStatus) => void) | undefined;
beforeEach(() => {
  jest.clearAllMocks();
  native.decodeImage.mockReset().mockResolvedValue('[]');
  native.getCameraPermissionStatus.mockReset().mockResolvedValue('granted');
  native.requestCameraPermission.mockReset().mockResolvedValue('granted');
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, listener) => {
      appState = listener;
      return { remove: jest.fn() };
    });
  jest.spyOn(Linking, 'openSettings').mockResolvedValue();
});
afterEach(() => jest.restoreAllMocks());
const camera = () => screen.getByTestId('camera');
const emit = () =>
  fireEvent(camera(), 'scanResult', { nativeEvent: { resultsJson: batch } });
async function ready() {
  return screen.findByTestId('camera');
}

test('the first raw result is selected once and confirm never starts a new scan', async () => {
  const confirm = jest.fn();
  render(<Scanner onConfirm={confirm} />);
  await ready();
  act(emit);
  expect(screen.getByText('001 original')).toBeTruthy();
  expect(screen.getByText('QR_CODE')).toBeTruthy();
  expect(camera().props.paused).toBe(true);
  const button = screen.getByRole('button', { name: '选用' });
  act(() => {
    fireEvent.press(button);
    fireEvent.press(button);
  });
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(confirm).toHaveBeenCalledWith(first);
  expect(camera().props.paused).toBe(true);
});
test('callback failure cannot turn an automatic delivery into failure or deliver it twice', async () => {
  const confirm = jest.fn(() => {
    throw new Error('business failure');
  });
  render(<Scanner autoConfirm onConfirm={confirm} />);
  await ready();
  const result = camera().props.onScanResult;
  expect(() => act(emit)).toThrow('business failure');
  act(() => result({ nativeEvent: { resultsJson: batch } }));
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('未识别到条码')).toBeNull();
});
test('rescan rejects callbacks captured before the new scan', async () => {
  const confirm = jest.fn();
  render(<Scanner onConfirm={confirm} />);
  await ready();
  const oldResult = camera().props.onScanResult;
  act(emit);
  fireEvent.press(screen.getByRole('button', { name: '重扫' }));
  act(() => oldResult({ nativeEvent: { resultsJson: batch } }));
  expect(screen.queryByText('001 original')).toBeNull();
  act(emit);
  fireEvent.press(screen.getByRole('button', { name: '选用' }));
  expect(confirm).toHaveBeenCalledTimes(1);
});
test('close invalidates a pending picker and returns its file without reading', async () => {
  const pick = deferred<ScannerImage | null>();
  const release = jest.fn();
  const confirm = jest.fn();
  const close = jest.fn();
  render(
    <Scanner
      onConfirm={confirm}
      onClose={close}
      pickImage={() => pick.promise}
    />
  );
  await ready();
  fireEvent.press(screen.getByRole('button', { name: '相册' }));
  fireEvent.press(screen.getByRole('button', { name: '返回' }));
  expect(screen.queryByTestId('camera')).toBeNull();
  await act(async () =>
    pick.resolve({ uri: 'file:///tmp/late.jpg', onSourceReleased: release })
  );
  expect(native.decodeImage).not.toHaveBeenCalled();
  expect(release).toHaveBeenCalledTimes(1);
  expect(close).toHaveBeenCalledTimes(1);
  expect(confirm).not.toHaveBeenCalled();
});
test('unmount during decode releases only after native completion and never adopts the result', async () => {
  const read = deferred<string>();
  const release = jest.fn();
  const confirm = jest.fn();
  native.decodeImage.mockReturnValueOnce(read.promise);
  const page = render(
    <Scanner
      autoConfirm
      onConfirm={confirm}
      pickImage={async () => ({
        uri: 'file:///tmp/photo.jpg',
        onSourceReleased: release,
      })}
    />
  );
  await ready();
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: '相册' }));
  });
  expect(native.decodeImage).toHaveBeenCalledWith('file:///tmp/photo.jpg', '');
  page.unmount();
  expect(release).not.toHaveBeenCalled();
  await act(async () => read.resolve(batch));
  expect(release).toHaveBeenCalledTimes(1);
  expect(confirm).not.toHaveBeenCalled();
});
test('format changes wait for the old read, discard its result, then start the new filter', async () => {
  const read = deferred<string>();
  const release = jest.fn();
  const confirm = jest.fn();
  native.decodeImage.mockReturnValueOnce(read.promise);
  const pickImage = async () => ({
    uri: 'file:///tmp/photo.jpg',
    onSourceReleased: release,
  });
  const page = render(
    <Scanner formats={['QR_CODE']} onConfirm={confirm} pickImage={pickImage} />
  );
  await ready();
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: '相册' }));
  });
  page.rerender(
    <Scanner formats={['EAN_13']} onConfirm={confirm} pickImage={pickImage} />
  );
  expect(camera().props.paused).toBe(true);
  await act(async () => read.resolve(batch));
  expect(release).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('001 original')).toBeNull();
  expect(camera().props.formatsCsv).toBe('EAN_13');
  expect(camera().props.paused).toBe(false);
});
test('equal format values and changed callbacks keep the selected result', async () => {
  const confirm = jest.fn();
  const page = render(
    <Scanner formats={['QR_CODE', 'EAN_13']} onConfirm={jest.fn()} />
  );
  await ready();
  act(emit);
  page.rerender(
    <Scanner
      title="新标题"
      formats={['EAN_13', 'QR_CODE', 'QR_CODE']}
      onConfirm={confirm}
    />
  );
  expect(screen.getByText('001 original')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: '选用' }));
  expect(confirm).toHaveBeenCalledWith(first);
  expect(native.getCameraPermissionStatus).toHaveBeenCalledTimes(1);
});
test('cancelled picker resumes scanning; decode empty and decode failure have distinct feedback', async () => {
  const pick = jest
    .fn()
    .mockResolvedValueOnce(null)
    .mockResolvedValue({ uri: 'file:///tmp/photo.jpg' });
  const onError = jest.fn();
  render(<Scanner onConfirm={jest.fn()} pickImage={pick} onError={onError} />);
  await ready();
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: '相册' }));
  });
  expect(camera().props.paused).toBe(false);
  expect(native.decodeImage).not.toHaveBeenCalled();
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: '相册' }));
  });
  expect(screen.getByText('未识别到条码')).toBeTruthy();
  expect(onError).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: '重扫' }));
  native.decodeImage.mockRejectedValueOnce({
    code: 'E_IMAGE_LOAD_FAILED',
    message: 'read failed',
  });
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: '相册' }));
  });
  expect(screen.getByText('图片识别失败')).toBeTruthy();
  expect(onError).toHaveBeenCalledWith(
    expect.objectContaining({ reason: 'image_unavailable' })
  );
});
test('fatal camera errors stop the camera and retry checks permissions; settings return reads once', async () => {
  render(<Scanner onConfirm={jest.fn()} />);
  await ready();
  fireEvent(camera(), 'scanError', {
    nativeEvent: { code: 'E_CAMERA_INIT', message: 'failed' },
  });
  expect(screen.queryByTestId('camera')).toBeNull();
  native.getCameraPermissionStatus.mockResolvedValueOnce('blocked');
  await act(async () =>
    fireEvent.press(screen.getByRole('button', { name: '重试' }))
  );
  expect(screen.getByText('需要相机权限')).toBeTruthy();
  await act(async () =>
    fireEvent.press(screen.getByRole('button', { name: '去设置开启' }))
  );
  await act(async () => {
    appState?.('active');
    appState?.('active');
  });
  expect(native.getCameraPermissionStatus).toHaveBeenCalledTimes(3);
  expect(native.requestCameraPermission).not.toHaveBeenCalled();
  await ready();
});

test('unknown permission status displays an error without requesting permission or starting a camera', async () => {
  native.getCameraPermissionStatus.mockResolvedValueOnce('future');
  const onError = jest.fn();
  render(<Scanner onConfirm={jest.fn()} onError={onError} />);
  await screen.findByText('相机启动失败');
  expect(native.requestCameraPermission).not.toHaveBeenCalled();
  expect(screen.queryByTestId('camera')).toBeNull();
  expect(onError).toHaveBeenCalledWith(
    expect.objectContaining({ reason: 'invalid_response' })
  );
});
test('torch button shows hardware reports rather than the requested state', async () => {
  render(<Scanner onConfirm={jest.fn()} />);
  await ready();
  fireEvent.press(screen.getByRole('button', { name: '手电筒' }));
  expect(camera().props.torch).toBe(true);
  expect(screen.queryByText('已开灯')).toBeNull();
  fireEvent(camera(), 'torchState', {
    nativeEvent: {
      on: true,
      hasAvailable: true,
      available: true,
      hasLowLight: false,
      lowLight: false,
    },
  });
  expect(screen.getByText('已开灯')).toBeTruthy();
});

test('torch already on outside the last request can be switched off', async () => {
  render(<Scanner onConfirm={jest.fn()} />);
  await ready();
  fireEvent(camera(), 'torchState', {
    nativeEvent: {
      on: true,
      hasAvailable: true,
      available: true,
      hasLowLight: false,
      lowLight: false,
    },
  });
  fireEvent.press(screen.getByRole('button', { name: '已开灯' }));
  expect(camera().props.torch).toBe(false);
});

test('a failed torch request can be retried from the reported off state', async () => {
  render(<Scanner onConfirm={jest.fn()} />);
  await ready();
  fireEvent.press(screen.getByRole('button', { name: '手电筒' }));
  expect(camera().props.torch).toBe(true);
  fireEvent(camera(), 'torchState', {
    nativeEvent: {
      on: false,
      hasAvailable: true,
      available: true,
      hasLowLight: false,
      lowLight: false,
    },
  });
  expect(camera().props.torch).toBe(false);
  fireEvent.press(screen.getByRole('button', { name: '手电筒' }));
  expect(camera().props.torch).toBe(true);
  expect(screen.queryByText('已开灯')).toBeNull();
});
