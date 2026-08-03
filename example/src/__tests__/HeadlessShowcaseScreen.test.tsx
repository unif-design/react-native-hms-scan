import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import {
  AppState,
  Linking,
  View,
  type AppStateStatus,
} from 'react-native';
import {
  getCameraPermissionStatus,
  requestCameraPermission,
  type HmsScanViewProps,
  type ScanResult,
} from '@unif/react-native-hms-scan';
import { HeadlessShowcaseScreen } from '../showcases/headless/HeadlessShowcaseScreen';

jest.mock('@unif/react-native-hms-scan', () =>
  require('@unif/react-native-hms-scan/mock')
);

const mockGetStatus = jest.mocked(getCameraPermissionStatus);
const mockRequest = jest.mocked(requestCameraPermission);

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

function renderScreen() {
  let viewProps: HmsScanViewProps | null = null;

  function HmsScanViewProbe(props: HmsScanViewProps) {
    viewProps = props;
    return <View testID="native-hms-scan-view" />;
  }

  render(
    <HeadlessShowcaseScreen
      onBack={jest.fn()}
      platform="android"
      HmsScanViewComponent={HmsScanViewProbe}
    />
  );

  return { getViewProps: () => viewProps };
}

beforeEach(() => {
  jest.restoreAllMocks();
  mockGetStatus.mockReset().mockResolvedValue('granted');
  mockRequest.mockReset().mockResolvedValue('granted');
});

it('仅在 permission snapshot 允许时挂载预览，显式申请后进入 granted', async () => {
  mockGetStatus.mockResolvedValueOnce('denied');
  const pendingRequest = Promise.resolve('granted' as const);
  mockRequest.mockReturnValueOnce(pendingRequest);

  renderScreen();

  await waitFor(() =>
    expect(screen.getByRole('button', { name: '申请相机权限' })).toBeOnTheScreen()
  );
  expect(screen.queryByTestId('headless-preview')).toBeNull();

  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: '申请相机权限' }));
    await pendingRequest;
  });

  await waitFor(() =>
    expect(screen.getByTestId('headless-preview')).toBeOnTheScreen()
  );
  expect(mockRequest).toHaveBeenCalledTimes(1);
});

it('blocked 打开设置后只在 App active 时重新查询权限', async () => {
  let appStateListener: ((state: AppStateStatus) => void) | undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListener = listener;
    return { remove: jest.fn() };
  });
  const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  mockGetStatus
    .mockResolvedValueOnce('denied')
    .mockResolvedValueOnce('granted');
  mockRequest.mockResolvedValueOnce('blocked');

  renderScreen();
  await screen.findByRole('button', { name: '申请相机权限' });
  fireEvent.press(screen.getByRole('button', { name: '申请相机权限' }));
  await screen.findByRole('button', { name: '打开系统设置' });
  expect(screen.queryByTestId('headless-preview')).toBeNull();

  fireEvent.press(screen.getByRole('button', { name: '打开系统设置' }));
  await waitFor(() => expect(openSettings).toHaveBeenCalledTimes(1));
  expect(mockGetStatus).toHaveBeenCalledTimes(1);

  await act(async () => {
    appStateListener?.('active');
  });
  await waitFor(() =>
    expect(screen.getByTestId('headless-preview')).toBeOnTheScreen()
  );
  expect(mockGetStatus).toHaveBeenCalledTimes(2);
});

it('权限 helper error fail-closed，重试查询后才挂载预览', async () => {
  mockGetStatus
    .mockRejectedValueOnce(
      Object.assign(new Error('no activity'), { code: 'E_NO_ACTIVITY' })
    )
    .mockResolvedValueOnce('granted');

  renderScreen();

  await screen.findByText('E_NO_ACTIVITY');
  expect(screen.queryByTestId('headless-preview')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: '重新检查权限' }));

  await waitFor(() =>
    expect(screen.getByTestId('headless-preview')).toBeOnTheScreen()
  );
});

it('把 paused、continuous、torch 请求值与 native 实际状态分开受控', async () => {
  const { getViewProps } = renderScreen();
  await screen.findByTestId('headless-preview');

  expect(getViewProps()).toMatchObject({
    paused: false,
    continuous: false,
    torch: false,
  });
  fireEvent.press(screen.getByRole('switch', { name: '暂停扫描' }));
  fireEvent.press(screen.getByRole('switch', { name: '连续扫描' }));
  fireEvent.press(screen.getByRole('switch', { name: '请求手电' }));

  expect(getViewProps()).toMatchObject({
    paused: true,
    continuous: true,
    torch: true,
  });
  expect(screen.getByText('手电请求：开启')).toBeOnTheScreen();
  expect(screen.getByText('手电实际：关闭')).toBeOnTheScreen();

  act(() => {
    getViewProps()?.onTorchStatus?.({ available: true, on: true });
  });
  expect(screen.getByText('手电实际：开启')).toBeOnTheScreen();
});

it('非连续命中后暂停并可继续，soft error 不卸载，fatal error 可重试', async () => {
  const { getViewProps } = renderScreen();
  await screen.findByTestId('headless-preview');

  act(() => {
    getViewProps()?.onScanResult?.([qrResult]);
  });
  expect(screen.getByText(qrResult.value)).toBeOnTheScreen();
  expect(getViewProps()?.paused).toBe(true);
  fireEvent.press(screen.getByRole('button', { name: '继续扫描' }));
  expect(getViewProps()?.paused).toBe(false);

  act(() => {
    getViewProps()?.onScanError?.({
      code: 'E_NO_RESULT',
      message: '未识别到条码',
    });
  });
  expect(screen.getByTestId('headless-preview')).toBeOnTheScreen();
  expect(getViewProps()?.paused).toBe(false);

  act(() => {
    getViewProps()?.onScanError?.({
      code: 'E_CAMERA_INIT',
      message: '相机初始化失败',
    });
  });
  expect(getViewProps()?.paused).toBe(true);
  fireEvent.press(screen.getByRole('button', { name: '重试扫描' }));
  expect(getViewProps()?.paused).toBe(false);
});
