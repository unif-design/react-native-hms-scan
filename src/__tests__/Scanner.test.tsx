/// <reference types="jest" />

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppState, Linking } from 'react-native';
import { Scanner } from '../Scanner/Scanner';

// 把底层原生组件换成纯桩，并捕获其 onScanResult / onScanError 供测试触发。
// （jest.mock 工厂不能引外部非 mock 前缀变量，故用 globalThis 中转。）
type MockHmsScanViewProps = {
  paused?: boolean;
  torch?: boolean;
  onScanResult?: (results: unknown[]) => void;
  onScanError?: (error: { code: string; message: string }) => void;
  onTorchStatus?: (status: { available: boolean; on: boolean }) => void;
};

jest.mock('../HmsScanView', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    HmsScanView: (props: MockHmsScanViewProps) => {
      (globalThis as Record<string, unknown>).__hmsScanProps = props;
      return React.createElement(View, { testID: 'hms-scan-view' });
    },
  };
});

jest.mock('../permissions', () => ({
  getCameraPermissionStatus: jest.fn(async () => 'granted'),
  requestCameraPermission: jest.fn(async () => 'granted'),
}));

jest.mock('../decodeImage', () => ({ decodeImage: jest.fn(async () => []) }));

const HINT = '将条码 / 二维码放入框内，自动扫描';
const emitScan = (results: unknown[]) =>
  nativeProps().onScanResult?.(results);
const nativeProps = () =>
  (globalThis as Record<string, unknown>).__hmsScanProps as MockHmsScanViewProps;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

let appStateListener: ((state: string) => void) | undefined;

beforeEach(() => {
  appStateListener = undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    appStateListener = listener as (state: string) => void;
    return { remove: jest.fn() };
  });
  jest.spyOn(Linking, 'openSettings').mockResolvedValue();

  const perms = jest.requireMock('../permissions') as {
    getCameraPermissionStatus: jest.Mock;
    requestCameraPermission: jest.Mock;
  };
  perms.getCameraPermissionStatus.mockReset().mockResolvedValue('granted');
  perms.requestCameraPermission.mockReset().mockResolvedValue('granted');

  const image = jest.requireMock('../decodeImage') as { decodeImage: jest.Mock };
  image.decodeImage.mockReset().mockResolvedValue([]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('<Scanner>', () => {
  it('不挂载内部 ToastHost，宿主无需 SafeAreaProvider', async () => {
    render(<Scanner />);
    await screen.findByText('扫一扫');
    expect(screen.queryByTestId('design-toast-host')).toBeNull();
  });

  it('autoConfirm 未传 onConfirm 时降级显示确认卡', async () => {
    render(<Scanner autoConfirm resolveProduct={async () => ({ name: 'X 商品' })} />);
    await screen.findByText('扫一扫');
    await act(async () => {
      emitScan([{ value: '1', format: 'QR_CODE' }]);
    });
    expect(await screen.findByText('X 商品')).toBeTruthy();
    expect(screen.getByText('确定')).toBeTruthy();
  });

  it('resolveProduct 的 undefined barcode 回退到扫描值', async () => {
    const onConfirm = jest.fn();
    render(
      <Scanner
        onConfirm={onConfirm}
        resolveProduct={async () => ({ name: 'X 商品', barcode: undefined })}
      />
    );
    await screen.findByText('扫一扫');
    await act(async () => {
      emitScan([{ value: '690', format: 'EAN_13' }]);
    });
    fireEvent.press(await screen.findByText('确定'));
    expect(onConfirm.mock.calls[0][0].barcode).toBe('690');
  });

  it('已授权 → 进入取景，显示标题与提示', async () => {
    render(<Scanner />);
    expect(await screen.findByText('扫一扫')).toBeTruthy();
    expect(screen.getByText(HINT)).toBeTruthy();
  });

  it('扫到码 → 解析商品 → 浮层确认卡 → 点确定带回结果', async () => {
    const onConfirm = jest.fn();
    const resolveProduct = jest.fn(async () => ({
      name: '阿萨姆原味奶茶 500ml',
      brand: '统一',
      price: '¥5.50',
      spec: '500ml × 15 瓶/箱',
    }));
    render(<Scanner onConfirm={onConfirm} resolveProduct={resolveProduct} />);
    await screen.findByText('扫一扫');

    await act(async () => {
      emitScan([{ value: '6925303773908', format: 'EAN_13' }]);
    });

    expect(await screen.findByText(/阿萨姆原味奶茶/)).toBeTruthy();
    expect(screen.getByText('确定')).toBeTruthy();
    expect(screen.getByText('重扫')).toBeTruthy();
    expect(resolveProduct).toHaveBeenCalledWith({
      value: '6925303773908',
      format: 'EAN_13',
    });

    fireEvent.press(screen.getByText('确定'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][0]).toMatchObject({ name: '阿萨姆原味奶茶 500ml' });
    expect(onConfirm.mock.calls[0][1]).toEqual({
      value: '6925303773908',
      format: 'EAN_13',
    });
  });

  it('点重扫 → 回到取景', async () => {
    render(<Scanner resolveProduct={async () => ({ name: 'X 商品' })} />);
    await screen.findByText('扫一扫');
    await act(async () => {
      emitScan([{ value: '1', format: 'QR_CODE' }]);
    });
    await screen.findByText('X 商品');
    fireEvent.press(screen.getByText('重扫'));
    expect(await screen.findByText(HINT)).toBeTruthy();
  });

  it('resolveProduct 返回 null → 未识别失败态', async () => {
    render(<Scanner resolveProduct={async () => null} />);
    await screen.findByText('扫一扫');
    await act(async () => {
      emitScan([{ value: '1', format: 'QR_CODE' }]);
    });
    expect(await screen.findByText('未识别到条码')).toBeTruthy();
    expect(screen.getByText('重扫')).toBeTruthy();
  });

  it('autoConfirm → 跳过结果卡，扫到直接回调 onConfirm', async () => {
    const onConfirm = jest.fn();
    render(
      <Scanner
        autoConfirm
        onConfirm={onConfirm}
        resolveProduct={async () => ({ name: 'X 商品' })}
      />
    );
    await screen.findByText('扫一扫');

    await act(async () => {
      emitScan([{ value: '6925303773908', format: 'EAN_13' }]);
    });

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onConfirm.mock.calls[0][0]).toMatchObject({ name: 'X 商品' });
    expect(onConfirm.mock.calls[0][1]).toEqual({
      value: '6925303773908',
      format: 'EAN_13',
    });
    // 不出结果卡:无"确定"/"重扫"
    expect(screen.queryByText('确定')).toBeNull();
    expect(screen.queryByText('重扫')).toBeNull();
  });

  it('autoConfirm + 未识别 → 仍走失败态，不触发 onConfirm', async () => {
    const onConfirm = jest.fn();
    render(
      <Scanner autoConfirm onConfirm={onConfirm} resolveProduct={async () => null} />
    );
    await screen.findByText('扫一扫');

    await act(async () => {
      emitScan([{ value: '1', format: 'QR_CODE' }]);
    });

    expect(await screen.findByText('未识别到条码')).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('打开相册前即暂停相机，并忽略等待期间的相机结果', async () => {
    let resolvePick!: (uri: string | null) => void;
    const pickImage = jest.fn(
      () =>
        new Promise<string | null>((resolve) => {
          resolvePick = resolve;
        })
    );
    const resolveProduct = jest.fn(async () => ({ name: 'X 商品' }));
    render(<Scanner pickImage={pickImage} resolveProduct={resolveProduct} />);
    await screen.findByText('扫一扫');

    fireEvent.press(screen.getByText('相册'));
    await waitFor(() => expect(nativeProps().paused).toBe(true));

    await act(async () => {
      nativeProps().onScanResult?.([{ value: 'camera', format: 'QR_CODE' }]);
    });
    expect(resolveProduct).not.toHaveBeenCalled();

    await act(async () => resolvePick(null));
    expect(await screen.findByText(HINT)).toBeTruthy();
    expect(nativeProps().paused).toBe(false);

    await act(async () => {
      nativeProps().onScanResult?.([{ value: 'after-cancel', format: 'QR_CODE' }]);
    });
    await waitFor(() =>
      expect(resolveProduct).toHaveBeenCalledWith({
        value: 'after-cancel',
        format: 'QR_CODE',
      })
    );
  });

  it('双入口时只确认相册图片结果', async () => {
    let resolvePick!: (uri: string | null) => void;
    const pickImage = jest.fn(
      () =>
        new Promise<string | null>((resolve) => {
          resolvePick = resolve;
        })
    );
    const decode = jest.requireMock('../decodeImage') as { decodeImage: jest.Mock };
    decode.decodeImage.mockResolvedValueOnce([{ value: 'image', format: 'QR_CODE' }]);
    const onConfirm = jest.fn();
    const resolveProduct = jest.fn(async () => ({ name: '图片商品' }));
    render(
      <Scanner
        autoConfirm
        pickImage={pickImage}
        onConfirm={onConfirm}
        resolveProduct={resolveProduct}
      />
    );
    await screen.findByText('扫一扫');

    fireEvent.press(screen.getByText('相册'));
    await waitFor(() => expect(nativeProps().paused).toBe(true));
    await act(async () => {
      nativeProps().onScanResult?.([{ value: 'camera', format: 'QR_CODE' }]);
    });
    await act(async () => resolvePick('file:///image.png'));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(resolveProduct).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][1]).toEqual({ value: 'image', format: 'QR_CODE' });
  });

  it('权限被拒 → 显示无权限遮罩', async () => {
    const perms = jest.requireMock('../permissions') as {
      getCameraPermissionStatus: jest.Mock;
      requestCameraPermission: jest.Mock;
    };
    perms.getCameraPermissionStatus.mockResolvedValueOnce('denied');
    perms.requestCameraPermission.mockResolvedValueOnce('blocked');
    render(<Scanner />);
    expect(await screen.findByText('需要相机权限')).toBeTruthy();
    expect(screen.getByText('去设置开启')).toBeTruthy();
  });

  it('权限 helper reject 时 fail-closed 并通知宿主', async () => {
    const error = Object.assign(new Error('no activity'), { code: 'E_NO_ACTIVITY' });
    const perms = jest.requireMock('../permissions') as {
      getCameraPermissionStatus: jest.Mock;
    };
    perms.getCameraPermissionStatus.mockRejectedValueOnce(error);
    const onScanError = jest.fn();

    render(<Scanner onScanError={onScanError} />);

    expect(await screen.findByText('相机启动失败')).toBeTruthy();
    expect(screen.queryByTestId('hms-scan-view')).toBeNull();
    expect(onScanError).toHaveBeenCalledWith({
      code: 'E_NO_ACTIVITY',
      message: 'no activity',
    });
  });

  it('从设置授权返回后恢复取景', async () => {
    const perms = jest.requireMock('../permissions') as {
      getCameraPermissionStatus: jest.Mock;
      requestCameraPermission: jest.Mock;
    };
    perms.getCameraPermissionStatus
      .mockResolvedValueOnce('blocked')
      .mockResolvedValueOnce('granted');
    render(<Scanner />);
    fireEvent.press(await screen.findByText('去设置开启'));
    expect(Linking.openSettings).toHaveBeenCalled();

    await act(async () => appStateListener?.('active'));
    expect(await screen.findByText(HINT)).toBeTruthy();
    expect(screen.getByTestId('hms-scan-view')).toBeTruthy();
    expect(perms.requestCameraPermission).not.toHaveBeenCalled();
  });

  it('普通 active 不重新查询权限', async () => {
    const perms = jest.requireMock('../permissions') as {
      getCameraPermissionStatus: jest.Mock;
    };
    render(<Scanner />);
    await screen.findByText(HINT);

    await act(async () => appStateListener?.('active'));
    expect(perms.getCameraPermissionStatus).toHaveBeenCalledTimes(1);
  });

  it('设置打开失败会清除恢复标记、进入错误页并上报', async () => {
    const error = Object.assign(new Error('settings failed'), { code: 'E_SETTINGS' });
    const perms = jest.requireMock('../permissions') as {
      getCameraPermissionStatus: jest.Mock;
    };
    perms.getCameraPermissionStatus.mockResolvedValueOnce('blocked');
    jest.spyOn(Linking, 'openSettings').mockRejectedValueOnce(error);
    const onScanError = jest.fn();
    render(<Scanner onScanError={onScanError} />);

    fireEvent.press(await screen.findByText('去设置开启'));
    expect(await screen.findByText('相机启动失败')).toBeTruthy();
    expect(onScanError).toHaveBeenCalledWith({ code: 'E_SETTINGS', message: 'settings failed' });

    await act(async () => appStateListener?.('active'));
    expect(perms.getCameraPermissionStatus).toHaveBeenCalledTimes(1);
  });

  it('设置打开失败后在途权限查询不会覆盖 fatal error', async () => {
    const settings = deferred<void>();
    const pendingPermission = deferred<'granted'>();
    const error = Object.assign(new Error('settings failed'), { code: 'E_SETTINGS' });
    const perms = jest.requireMock('../permissions') as {
      getCameraPermissionStatus: jest.Mock;
    };
    perms.getCameraPermissionStatus
      .mockResolvedValueOnce('blocked')
      .mockReturnValueOnce(pendingPermission.promise);
    jest.spyOn(Linking, 'openSettings').mockReturnValueOnce(settings.promise);
    render(<Scanner />);

    fireEvent.press(await screen.findByText('去设置开启'));
    await act(async () => appStateListener?.('active'));
    await act(async () => settings.reject(error));
    expect(await screen.findByText('相机启动失败')).toBeTruthy();

    await act(async () => pendingPermission.resolve('granted'));
    expect(screen.getByText('相机启动失败')).toBeTruthy();
    expect(screen.queryByTestId('hms-scan-view')).toBeNull();
  });

  it('较旧 permission generation 晚完成不会覆盖较新的检查', async () => {
    const olderPermission = deferred<'blocked'>();
    const perms = jest.requireMock('../permissions') as {
      getCameraPermissionStatus: jest.Mock;
    };
    perms.getCameraPermissionStatus
      .mockResolvedValueOnce('blocked')
      .mockReturnValueOnce(olderPermission.promise)
      .mockResolvedValueOnce('granted');
    render(<Scanner />);

    fireEvent.press(await screen.findByText('去设置开启'));
    await act(async () => appStateListener?.('active'));
    fireEvent.press(screen.getByText('去设置开启'));
    await act(async () => appStateListener?.('active'));
    expect(await screen.findByText(HINT)).toBeTruthy();

    await act(async () => olderPermission.resolve('blocked'));
    expect(screen.getByText(HINT)).toBeTruthy();
    expect(screen.queryByText('需要相机权限')).toBeNull();
  });

  it('卸载后忽略尚未完成的权限检查', async () => {
    const pendingPermission = deferred<never>();
    const error = Object.assign(new Error('late permission failure'), { code: 'E_NO_ACTIVITY' });
    const perms = jest.requireMock('../permissions') as {
      getCameraPermissionStatus: jest.Mock;
    };
    perms.getCameraPermissionStatus.mockReturnValueOnce(pendingPermission.promise);
    const onScanError = jest.fn();
    const { unmount } = render(<Scanner onScanError={onScanError} />);

    unmount();
    await act(async () => pendingPermission.reject(error));
    expect(onScanError).not.toHaveBeenCalled();
  });

  it('E_CAMERA_INIT 进入错误页，重试后重新挂载相机', async () => {
    const onScanError = jest.fn();
    render(<Scanner onScanError={onScanError} />);
    await screen.findByText(HINT);
    act(() => nativeProps().onScanError?.({ code: 'E_CAMERA_INIT', message: 'boom' }));
    expect(await screen.findByText('相机启动失败')).toBeTruthy();
    expect(screen.queryByTestId('hms-scan-view')).toBeNull();
    expect(onScanError).toHaveBeenCalledWith({ code: 'E_CAMERA_INIT', message: 'boom' });

    fireEvent.press(screen.getByText('重试'));
    expect(await screen.findByText(HINT)).toBeTruthy();
    expect(screen.getByTestId('hms-scan-view')).toBeTruthy();
  });

  it('E_NO_RESULT 只通知宿主并保持取景', async () => {
    const onScanError = jest.fn();
    render(<Scanner onScanError={onScanError} />);
    await screen.findByText(HINT);
    act(() => nativeProps().onScanError?.({ code: 'E_NO_RESULT', message: 'empty' }));
    expect(screen.getByText(HINT)).toBeTruthy();
    expect(screen.queryByText('相机启动失败')).toBeNull();
    expect(onScanError).toHaveBeenCalledWith({ code: 'E_NO_RESULT', message: 'empty' });
  });

  it('E_NO_CAMERA_PERMISSION 进入 denied、卸载相机并通知宿主', async () => {
    const onScanError = jest.fn();
    render(<Scanner onScanError={onScanError} />);
    await screen.findByText(HINT);
    act(() =>
      nativeProps().onScanError?.({
        code: 'E_NO_CAMERA_PERMISSION',
        message: 'permission missing',
      })
    );

    expect(await screen.findByText('需要相机权限')).toBeTruthy();
    expect(screen.queryByTestId('hms-scan-view')).toBeNull();
    expect(onScanError).toHaveBeenCalledWith({
      code: 'E_NO_CAMERA_PERMISSION',
      message: 'permission missing',
    });
  });

  it('rerender 后 view error 使用最新 onScanError', async () => {
    const previousOnScanError = jest.fn();
    const latestOnScanError = jest.fn();
    const { rerender } = render(<Scanner onScanError={previousOnScanError} />);
    await screen.findByText(HINT);
    rerender(<Scanner onScanError={latestOnScanError} />);

    act(() => nativeProps().onScanError?.({ code: 'E_NO_RESULT', message: 'empty' }));
    expect(previousOnScanError).not.toHaveBeenCalled();
    expect(latestOnScanError).toHaveBeenCalledWith({ code: 'E_NO_RESULT', message: 'empty' });
  });
});
