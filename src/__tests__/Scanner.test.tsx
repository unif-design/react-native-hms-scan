import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState, Linking, type AppStateStatus } from 'react-native';
import { Button } from '@unif/react-native-design';
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

test('a failed torch request can be retried after the initial off state was already reported', async () => {
  render(<Scanner onConfirm={jest.fn()} />);
  await ready();
  const offState = {
    nativeEvent: {
      on: false,
      hasAvailable: true,
      available: true,
      hasLowLight: false,
      lowLight: false,
    },
  };
  fireEvent(camera(), 'torchState', offState);
  fireEvent.press(screen.getByRole('button', { name: '手电筒' }));
  expect(camera().props.torch).toBe(true);
  fireEvent(camera(), 'torchState', offState);
  expect(camera().props.torch).toBe(false);
  fireEvent.press(screen.getByRole('button', { name: '手电筒' }));
  expect(camera().props.torch).toBe(true);
  expect(screen.queryByText('已开灯')).toBeNull();
});

test.each(['denied', 'undetermined'])(
  'requests permission from %s before creating a camera',
  async (status) => {
    native.getCameraPermissionStatus.mockResolvedValueOnce(status);
    render(<Scanner onConfirm={jest.fn()} />);
    await ready();
    expect(native.requestCameraPermission).toHaveBeenCalledTimes(1);
  }
);

test('a rejected permission request displays the normalized error and can close', async () => {
  native.getCameraPermissionStatus.mockResolvedValueOnce('denied');
  native.requestCameraPermission.mockRejectedValueOnce({
    code: 'E_NO_CAMERA_PERMISSION',
    message: 'denied',
  });
  const onError = jest.fn();
  const onClose = jest.fn();
  render(<Scanner onConfirm={jest.fn()} onError={onError} onClose={onClose} />);
  await screen.findByText('需要相机权限');
  expect(onError).toHaveBeenCalledWith(
    expect.objectContaining({ reason: 'permission_denied' })
  );
  fireEvent.press(screen.getByRole('button', { name: '取消' }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId('camera')).toBeNull();
});

test('denial after the system prompt shows settings without creating a camera', async () => {
  native.getCameraPermissionStatus.mockResolvedValueOnce('undetermined');
  native.requestCameraPermission.mockResolvedValueOnce('blocked');
  render(<Scanner onConfirm={jest.fn()} />);
  await screen.findByText('需要相机权限');
  expect(screen.queryByTestId('camera')).toBeNull();
});

test.each(['resolve', 'reject'] as const)(
  'unmount ignores a late permission read %s',
  async (completion) => {
    const permission = deferred<string>();
    native.getCameraPermissionStatus.mockReturnValueOnce(permission.promise);
    const onError = jest.fn();
    const page = render(<Scanner onConfirm={jest.fn()} onError={onError} />);
    page.unmount();
    await act(async () =>
      completion === 'resolve'
        ? permission.resolve('granted')
        : permission.reject(new Error('late'))
    );
    expect(native.requestCameraPermission).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  }
);

test('a replaced configuration ignores the earlier permission prompt', async () => {
  const permission = deferred<string>();
  native.getCameraPermissionStatus.mockResolvedValueOnce('denied');
  native.requestCameraPermission.mockReturnValueOnce(permission.promise);
  const page = render(<Scanner formats={['QR_CODE']} onConfirm={jest.fn()} />);
  await act(async () => {});
  page.rerender(<Scanner formats={['EAN_13']} onConfirm={jest.fn()} />);
  await ready();
  await act(async () => permission.resolve('granted'));
  expect(camera().props.formatsCsv).toBe('EAN_13');
});

test('invalid format input fails before permission lookup and recovers when corrected', async () => {
  const onError = jest.fn();
  const page = render(
    <Scanner
      formats={['invalid' as 'QR_CODE']}
      onConfirm={jest.fn()}
      onError={onError}
      onClose={jest.fn()}
    />
  );
  expect(screen.getByText('相机启动失败')).toBeTruthy();
  expect(native.getCameraPermissionStatus).not.toHaveBeenCalled();
  expect(onError).toHaveBeenCalledWith(
    expect.objectContaining({ reason: 'invalid_input' })
  );
  page.rerender(<Scanner formats={['QR_CODE']} onConfirm={jest.fn()} />);
  await ready();
  expect(camera().props.formatsCsv).toBe('QR_CODE');
});

test('closing is idempotent and configuration changes cannot reopen a closed scanner', async () => {
  const onClose = jest.fn();
  const page = render(<Scanner onConfirm={jest.fn()} onClose={onClose} />);
  await ready();
  const button = screen.getByRole('button', { name: '返回' });
  act(() => {
    fireEvent.press(button);
    fireEvent.press(button);
  });
  page.rerender(
    <Scanner formats={['QR_CODE']} onConfirm={jest.fn()} onClose={onClose} />
  );
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(native.getCameraPermissionStatus).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId('camera')).toBeNull();
});

test('stale error and torch callbacks cannot affect the next scan or an unmounted screen', async () => {
  const onError = jest.fn();
  const page = render(<Scanner onConfirm={jest.fn()} onError={onError} />);
  await ready();
  const oldError = camera().props.onScanError;
  const oldTorch = camera().props.onTorchState;
  act(emit);
  fireEvent.press(screen.getByRole('button', { name: '重扫' }));
  act(() => {
    oldError({ nativeEvent: { code: 'E_CAMERA_INIT', message: 'late' } });
    oldTorch({
      nativeEvent: {
        on: true,
        hasAvailable: true,
        available: true,
        hasLowLight: false,
        lowLight: false,
      },
    });
  });
  expect(camera().props.torch).toBe(false);
  expect(onError).not.toHaveBeenCalled();
  const currentError = camera().props.onScanError;
  page.unmount();
  act(() =>
    currentError({
      nativeEvent: { code: 'E_CAMERA_INIT', message: 'detached' },
    })
  );
  expect(onError).not.toHaveBeenCalled();
});

test('hiding torch clears the request and later hardware reports cannot turn it back on', async () => {
  const page = render(<Scanner onConfirm={jest.fn()} />);
  await ready();
  fireEvent.press(screen.getByRole('button', { name: '手电筒' }));
  page.rerender(<Scanner onConfirm={jest.fn()} showTorch={false} />);
  fireEvent(camera(), 'torchState', {
    nativeEvent: {
      on: true,
      hasAvailable: true,
      available: true,
      hasLowLight: false,
      lowLight: false,
    },
  });
  expect(camera().props.torch).toBe(false);
  expect(screen.queryByRole('button', { name: '已开灯' })).toBeNull();
});

test('settings failure reports an unavailable error while the screen is active', async () => {
  native.getCameraPermissionStatus.mockResolvedValueOnce('blocked');
  jest
    .mocked(Linking.openSettings)
    .mockRejectedValueOnce(new Error('settings unavailable'));
  const onError = jest.fn();
  render(<Scanner onConfirm={jest.fn()} onError={onError} />);
  await screen.findByText('需要相机权限');
  await act(async () =>
    fireEvent.press(screen.getByRole('button', { name: '去设置开启' }))
  );
  expect(onError).toHaveBeenCalledWith(
    expect.objectContaining({ reason: 'unavailable' })
  );
  expect(screen.getByText('相机启动失败')).toBeTruthy();
  await act(async () => appState?.('active'));
  expect(native.getCameraPermissionStatus).toHaveBeenCalledTimes(1);
});

test.each(['close', 'unmount'] as const)(
  'late settings rejection after %s is ignored',
  async (action) => {
    const settings = deferred<void>();
    native.getCameraPermissionStatus.mockResolvedValueOnce('blocked');
    jest.mocked(Linking.openSettings).mockReturnValueOnce(settings.promise);
    const onError = jest.fn();
    const page = render(
      <Scanner onConfirm={jest.fn()} onClose={jest.fn()} onError={onError} />
    );
    await screen.findByText('需要相机权限');
    fireEvent.press(screen.getByRole('button', { name: '去设置开启' }));
    if (action === 'close')
      fireEvent.press(screen.getByRole('button', { name: '取消' }));
    else page.unmount();
    await act(async () => settings.reject(new Error('late')));
    expect(onError).not.toHaveBeenCalled();
  }
);

test('image selection accepts one operation, releases its source and adopts the first result', async () => {
  const image = deferred<ScannerImage | null>();
  const pickImage = jest.fn(() => image.promise);
  const release = jest.fn();
  const onConfirm = jest.fn();
  native.decodeImage.mockResolvedValueOnce(batch);
  render(
    <Scanner
      onConfirm={onConfirm}
      pickImage={pickImage}
      autoConfirm
      formats={['QR_CODE']}
    />
  );
  await ready();
  const album = screen.getByRole('button', { name: '相册' });
  act(() => {
    fireEvent.press(album);
    fireEvent.press(album);
  });
  expect(pickImage).toHaveBeenCalledTimes(1);
  await act(async () =>
    image.resolve({ uri: 'file:///tmp/first.jpg', onSourceReleased: release })
  );
  expect(native.decodeImage).toHaveBeenCalledWith(
    'file:///tmp/first.jpg',
    'QR_CODE'
  );
  expect(release).toHaveBeenCalledTimes(1);
  expect(onConfirm).toHaveBeenCalledWith(first);
});

test('a picker rejection without an observer shows image feedback and supports rescan', async () => {
  render(
    <Scanner
      onConfirm={jest.fn()}
      pickImage={async () => {
        throw 'picker closed unexpectedly';
      }}
    />
  );
  await ready();
  await act(async () =>
    fireEvent.press(screen.getByRole('button', { name: '相册' }))
  );
  expect(screen.getByText('图片识别失败')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: '重扫' }));
  expect(camera().props.paused).toBe(false);
});

test('an empty camera batch leaves scanning active', async () => {
  const confirm = jest.fn();
  render(<Scanner onConfirm={confirm} />);
  await ready();
  fireEvent(camera(), 'scanResult', { nativeEvent: { resultsJson: '[]' } });
  expect(camera().props.paused).toBe(false);
  expect(confirm).not.toHaveBeenCalled();
});

test('a delayed rescan press after unmount does not restart permission or camera work', async () => {
  const page = render(<Scanner onConfirm={jest.fn()} />);
  await ready();
  act(emit);
  const rescan = screen
    .UNSAFE_getAllByType(Button)
    .find((button) => button.props.label === '重扫')!.props.onPress;
  page.unmount();
  act(() => rescan());
  expect(native.getCameraPermissionStatus).toHaveBeenCalledTimes(1);
});

test('a delayed rescan during image selection waits for release before restarting', async () => {
  const pick = deferred<ScannerImage | null>();
  const release = jest.fn();
  render(<Scanner onConfirm={jest.fn()} pickImage={() => pick.promise} />);
  await ready();
  act(emit);
  const rescan = screen
    .UNSAFE_getAllByType(Button)
    .find((button) => button.props.label === '重扫')!.props.onPress;
  fireEvent.press(screen.getByRole('button', { name: '重扫' }));
  fireEvent.press(screen.getByRole('button', { name: '相册' }));
  act(() => rescan());
  expect(camera().props.paused).toBe(true);
  await act(async () =>
    pick.resolve({ uri: 'file:///tmp/stale.jpg', onSourceReleased: release })
  );
  expect(release).toHaveBeenCalledTimes(1);
  expect(native.decodeImage).not.toHaveBeenCalled();
  expect(camera().props.paused).toBe(false);
});

test('a delayed rescan respects a newly invalid configuration', async () => {
  const onError = jest.fn();
  const page = render(<Scanner onConfirm={jest.fn()} onError={onError} />);
  await ready();
  act(emit);
  const rescan = screen
    .UNSAFE_getAllByType(Button)
    .find((button) => button.props.label === '重扫')!.props.onPress;
  page.rerender(
    <Scanner
      formats={['invalid' as 'QR_CODE']}
      onConfirm={jest.fn()}
      onError={onError}
    />
  );
  act(() => rescan());
  expect(onError).toHaveBeenLastCalledWith(
    expect.objectContaining({ reason: 'invalid_input' })
  );
  expect(screen.queryByTestId('camera')).toBeNull();
});

test('a delayed retry during image selection waits before querying permission', async () => {
  const pick = deferred<ScannerImage | null>();
  render(<Scanner onConfirm={jest.fn()} pickImage={() => pick.promise} />);
  await ready();
  fireEvent(camera(), 'scanError', {
    nativeEvent: { code: 'E_CAMERA_INIT', message: 'failed' },
  });
  const retry = screen
    .UNSAFE_getAllByType(Button)
    .find((button) => button.props.label === '重试')!.props.onPress;
  await act(async () => retry());
  fireEvent.press(screen.getByRole('button', { name: '相册' }));
  act(() => retry());
  expect(native.getCameraPermissionStatus).toHaveBeenCalledTimes(2);
  await act(async () => pick.resolve(null));
  expect(native.getCameraPermissionStatus).toHaveBeenCalledTimes(3);
});
