/// <reference types="jest" />

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
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

afterEach(() => {
  jest.clearAllMocks();
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
});
