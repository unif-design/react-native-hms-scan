/// <reference types="jest" />

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Scanner } from '../Scanner/Scanner';

// 把底层原生组件换成纯桩，并捕获其 onScanResult / onScanError 供测试触发。
// （jest.mock 工厂不能引外部非 mock 前缀变量，故用 globalThis 中转。）
jest.mock('../HmsScanView', () => ({
  HmsScanView: (props: { onScanResult?: unknown; onScanError?: unknown }) => {
    (globalThis as Record<string, unknown>).__emitScan = props.onScanResult;
    (globalThis as Record<string, unknown>).__emitError = props.onScanError;
    return null;
  },
}));

jest.mock('../permissions', () => ({
  getCameraPermissionStatus: jest.fn(async () => 'granted'),
  requestCameraPermission: jest.fn(async () => 'granted'),
}));

jest.mock('../decodeImage', () => ({ decodeImage: jest.fn(async () => []) }));

const HINT = '将条码 / 二维码放入框内，自动扫描';
const emitScan = (results: unknown[]) =>
  (
    (globalThis as Record<string, unknown>).__emitScan as (r: unknown[]) => void
  )?.(results);

afterEach(() => {
  jest.clearAllMocks();
});

describe('<Scanner>', () => {
  it('已授权 → 进入取景，显示标题与提示', async () => {
    render(<Scanner />);
    expect(await screen.findByText('扫一扫')).toBeTruthy();
    expect(screen.getByText(HINT)).toBeTruthy();
  });

  it('扫到码 → 解析商品 → 浮层确认卡 → 点确认带回结果', async () => {
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
    expect(screen.getByText('确认')).toBeTruthy();
    expect(screen.getByText('继续扫描')).toBeTruthy();
    expect(resolveProduct).toHaveBeenCalledWith({
      value: '6925303773908',
      format: 'EAN_13',
    });

    fireEvent.press(screen.getByText('确认'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][0]).toMatchObject({ name: '阿萨姆原味奶茶 500ml' });
    expect(onConfirm.mock.calls[0][1]).toEqual({
      value: '6925303773908',
      format: 'EAN_13',
    });
  });

  it('点继续扫描 → 回到取景', async () => {
    render(<Scanner resolveProduct={async () => ({ name: 'X 商品' })} />);
    await screen.findByText('扫一扫');
    await act(async () => {
      emitScan([{ value: '1', format: 'QR_CODE' }]);
    });
    await screen.findByText('X 商品');
    fireEvent.press(screen.getByText('继续扫描'));
    expect(await screen.findByText(HINT)).toBeTruthy();
  });

  it('resolveProduct 返回 null → 未识别失败态', async () => {
    render(<Scanner resolveProduct={async () => null} />);
    await screen.findByText('扫一扫');
    await act(async () => {
      emitScan([{ value: '1', format: 'QR_CODE' }]);
    });
    expect(await screen.findByText('未识别到条码')).toBeTruthy();
    expect(screen.getByText('重新扫描')).toBeTruthy();
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
