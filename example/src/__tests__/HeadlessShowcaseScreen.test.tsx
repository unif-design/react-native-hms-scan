import { useEffect, useRef } from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { AppState, Linking, View, type AppStateStatus } from 'react-native';
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

function renderScreen({
  platform = 'android',
}: {
  platform?: 'android' | 'ios';
} = {}) {
  let viewProps: HmsScanViewProps | null = null;
  let nextInstanceId = 0;
  const mountedInstances: number[] = [];
  const unmountedInstances: number[] = [];

  function HmsScanViewProbe(props: HmsScanViewProps) {
    const instanceId = useRef<number | null>(null);
    if (instanceId.current === null) {
      instanceId.current = ++nextInstanceId;
    }
    viewProps = props;
    const currentInstanceId = instanceId.current;

    useEffect(() => {
      mountedInstances.push(currentInstanceId);
      return () => {
        unmountedInstances.push(currentInstanceId);
      };
    }, [currentInstanceId]);

    return <View testID={`native-hms-scan-view-${currentInstanceId}`} />;
  }

  render(
    <HeadlessShowcaseScreen
      onBack={jest.fn()}
      platform={platform}
      HmsScanViewComponent={HmsScanViewProbe}
    />
  );

  return {
    getViewProps: () => viewProps,
    getMountedInstances: () => mountedInstances,
    getUnmountedInstances: () => unmountedInstances,
  };
}

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  mockGetStatus.mockReset().mockResolvedValue('granted');
  mockRequest.mockReset().mockResolvedValue('granted');
});

it('仅在 permission snapshot 允许时挂载预览，显式申请后进入 granted', async () => {
  mockGetStatus.mockResolvedValueOnce('denied');
  const pendingRequest = Promise.resolve('granted' as const);
  mockRequest.mockReturnValueOnce(pendingRequest);

  renderScreen();

  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: '申请相机权限' })
    ).toBeOnTheScreen()
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
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_type, listener) => {
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

it('iOS 初次 query blocked 只提供打开设置，不提供或调用 request', async () => {
  const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  mockGetStatus.mockResolvedValueOnce('blocked');

  renderScreen({ platform: 'ios' });

  const settingsButton = await screen.findByRole('button', {
    name: '打开系统设置',
  });
  expect(
    screen.queryByRole('button', { name: '申请相机权限' })
  ).not.toBeOnTheScreen();
  expect(mockRequest).not.toHaveBeenCalled();

  fireEvent.press(settingsButton);
  await waitFor(() => expect(openSettings).toHaveBeenCalledTimes(1));
  expect(mockRequest).not.toHaveBeenCalled();
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
  expect(screen.getByLabelText('正在扫描')).toBeOnTheScreen();
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

it('非连续命中后暂停并可继续', async () => {
  const { getViewProps } = renderScreen();
  await screen.findByTestId('headless-preview');

  act(() => {
    getViewProps()?.onScanResult?.([qrResult]);
  });
  expect(screen.getByText(qrResult.value)).toBeOnTheScreen();
  expect(getViewProps()?.paused).toBe(true);
  fireEvent.press(screen.getByRole('button', { name: '继续扫描' }));
  expect(getViewProps()?.paused).toBe(false);
});

it('soft E_NO_RESULT 保持同一个 native view instance', async () => {
  const { getViewProps, getMountedInstances, getUnmountedInstances } =
    renderScreen();
  await screen.findByTestId('headless-preview');

  act(() => {
    getViewProps()?.onScanError?.({
      code: 'E_NO_RESULT',
      message: '未识别到条码',
    });
  });
  expect(screen.getByTestId('headless-preview')).toBeOnTheScreen();
  expect(getViewProps()?.paused).toBe(false);
  expect(getMountedInstances()).toEqual([1]);
  expect(getUnmountedInstances()).toEqual([]);
});

it('fatal E_CAMERA_INIT 重试会卸载旧 probe 并挂载新 probe', async () => {
  const { getViewProps, getMountedInstances, getUnmountedInstances } =
    renderScreen();
  await screen.findByTestId('headless-preview');

  act(() => {
    getViewProps()?.onScanError?.({
      code: 'E_CAMERA_INIT',
      message: '相机初始化失败',
    });
  });
  expect(getViewProps()?.paused).toBe(true);
  expect(getMountedInstances()).toEqual([1]);
  expect(getUnmountedInstances()).toEqual([]);

  fireEvent.press(screen.getByRole('button', { name: '重试扫描' }));

  expect(getViewProps()?.paused).toBe(false);
  expect(getMountedInstances()).toEqual([1, 2]);
  expect(getUnmountedInstances()).toEqual([1]);
  expect(screen.getByTestId('native-hms-scan-view-2')).toBeOnTheScreen();
});

it('permission view error 立即卸载 probe 且复查失败前保持 fail-closed', async () => {
  mockGetStatus
    .mockResolvedValueOnce('granted')
    .mockRejectedValueOnce(new Error('permission check failed'));
  const { getViewProps, getMountedInstances, getUnmountedInstances } =
    renderScreen();
  await screen.findByTestId('headless-preview');

  act(() => {
    getViewProps()?.onScanError?.({
      code: 'E_NO_CAMERA_PERMISSION',
      message: '相机权限已失效',
    });
  });

  expect(screen.queryByTestId('headless-preview')).not.toBeOnTheScreen();
  expect(getMountedInstances()).toEqual([1]);
  expect(getUnmountedInstances()).toEqual([1]);
  fireEvent.press(screen.getByRole('button', { name: '重新检查权限' }));
  await screen.findByText('E_UNKNOWN');
  expect(screen.queryByTestId('headless-preview')).not.toBeOnTheScreen();
  expect(getMountedInstances()).toEqual([1]);
});
