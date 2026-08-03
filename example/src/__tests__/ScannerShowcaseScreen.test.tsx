import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import type {
  ScanError,
  ScannerProps,
  ScanProduct,
  ScanResult,
} from '@unif/react-native-hms-scan';
import { pickLocalImage } from '../shared/pickLocalImage';
import { lookupDemoProduct } from '../showcases/scanner/products';
import {
  initialScannerDemoState,
  type ScannerDemoState,
} from '../showcases/scanner/scannerModel';
import {
  buildScannerProps,
  ScannerShowcaseScreen,
} from '../showcases/scanner/ScannerShowcaseScreen';

jest.mock('@unif/react-native-hms-scan', () =>
  require('@unif/react-native-hms-scan/mock')
);

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

const milkTeaResult: ScanResult = {
  value: '6925303773908',
  format: 'EAN_13',
  contentType: 'OTHER',
  cornerPoints: [
    { x: 12, y: 24 },
    { x: 212, y: 24 },
    { x: 212, y: 88 },
    { x: 12, y: 88 },
  ],
};

const milkTeaProduct: ScanProduct = {
  name: '阿萨姆原味奶茶 500ml',
  brand: '统一',
  barcode: '6925303773908',
  spec: '500ml × 15 瓶/箱',
  stockShort: '充足',
  price: '¥5.50',
};

const scanError: ScanError = {
  code: 'E_CAMERA_INIT',
  message: '相机初始化失败',
};

function createCallbacks(): Required<
  Pick<
    ScannerProps,
    | 'onClose'
    | 'onScanError'
    | 'resolveProduct'
    | 'onConfirm'
    | 'pickImage'
  >
> {
  return {
    onClose: jest.fn(),
    onScanError: jest.fn(),
    resolveProduct: lookupDemoProduct,
    onConfirm: jest.fn(),
    pickImage: pickLocalImage,
  };
}

function renderWithScanner() {
  let capturedProps: ScannerProps | null = null;

  function ScannerProbe(props: ScannerProps) {
    capturedProps = props;
    return <View testID="scanner-boundary" />;
  }

  render(
    <ScannerShowcaseScreen
      onBack={jest.fn()}
      ScannerComponent={ScannerProbe}
    />
  );

  return {
    getScannerProps: () => capturedProps,
  };
}

describe('buildScannerProps', () => {
  it('把 reducer state、safe-area 和 public adapter 接到 Scanner props', () => {
    const state: ScannerDemoState = {
      ...initialScannerDemoState,
      preset: 'qr',
      autoConfirm: true,
    };
    const callbacks = createCallbacks();

    expect(
      buildScannerProps(
        state,
        { top: 24, right: 0, bottom: 16, left: 0 },
        callbacks
      )
    ).toEqual({
      title: '扫一扫',
      formats: ['QR_CODE'],
      topInset: 24,
      bottomInset: 16,
      autoConfirm: true,
      ...callbacks,
    });
  });

  it('全部码制不伪造 formats 限制', () => {
    expect(
      buildScannerProps(
        initialScannerDemoState,
        { top: 24, right: 0, bottom: 16, left: 0 },
        createCallbacks()
      ).formats
    ).toBeUndefined();
  });
});

describe('ScannerShowcaseScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('active 时只渲染 Scanner 边界并复用共享 adapter', () => {
    const { getScannerProps } = renderWithScanner();

    fireEvent.press(screen.getByRole('button', { name: '进入全屏 Scanner' }));

    expect(screen.getByTestId('scanner-boundary')).toBeOnTheScreen();
    expect(screen.queryByText('Scanner 配置')).toBeNull();
    expect(getScannerProps()?.pickImage).toBe(pickLocalImage);
    expect(getScannerProps()?.resolveProduct).toBe(lookupDemoProduct);
  });

  it('Scanner onClose 返回配置页', () => {
    const { getScannerProps } = renderWithScanner();
    fireEvent.press(screen.getByRole('button', { name: '进入全屏 Scanner' }));

    act(() => {
      getScannerProps()?.onClose?.();
    });

    expect(screen.getByText('Scanner 配置')).toBeOnTheScreen();
  });

  it('保存普通 ScanError，并可从 Scanner 返回后查看', () => {
    const { getScannerProps } = renderWithScanner();
    fireEvent.press(screen.getByRole('button', { name: '进入全屏 Scanner' }));

    act(() => {
      getScannerProps()?.onScanError?.(scanError);
      getScannerProps()?.onClose?.();
    });

    expect(screen.getByText('E_CAMERA_INIT')).toBeOnTheScreen();
    expect(screen.getByText('相机初始化失败')).toBeOnTheScreen();
  });

  it.each([
    ['关闭', false],
    ['开启', true],
  ] as const)('autoConfirm %s 路径都同步保存完整确认结果', (_label, enabled) => {
    const { getScannerProps } = renderWithScanner();

    if (enabled) {
      fireEvent.press(screen.getByRole('switch', { name: '自动确认' }));
    }
    fireEvent.press(screen.getByRole('button', { name: '进入全屏 Scanner' }));

    expect(getScannerProps()?.autoConfirm).toBe(enabled);
    act(() => {
      getScannerProps()?.onConfirm?.(milkTeaProduct, milkTeaResult);
    });

    expect(screen.getByText('Scanner 配置')).toBeOnTheScreen();
    expect(screen.getByTestId('last-confirmed-json')).toHaveTextContent(
      JSON.stringify(
        { product: milkTeaProduct, result: milkTeaResult },
        null,
        2
      )
    );
  });

  it('配置页返回按钮调用上层路由', () => {
    const onBack = jest.fn();
    render(<ScannerShowcaseScreen onBack={onBack} />);

    fireEvent.press(screen.getByRole('button', { name: '返回' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
