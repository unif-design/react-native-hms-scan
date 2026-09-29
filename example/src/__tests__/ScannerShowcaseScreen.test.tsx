import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { ThemeProvider, useTheme } from '@unif/react-native-design';
import type {
  ScanFailure,
  ScannerProps,
  ScanResult,
} from '@unif/react-native-hms-scan';
import { pickLocalImage } from '../shared/pickLocalImage';
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

const scanError: ScanFailure = {
  reason: 'unavailable',
  message: '相机初始化失败',
};

function createCallbacks(): Required<
  Pick<ScannerProps, 'onClose' | 'onError' | 'onConfirm' | 'pickImage'>
> {
  return {
    onClose: jest.fn(),
    onError: jest.fn(),
    onConfirm: jest.fn(),
    pickImage: pickLocalImage,
  };
}

function renderWithScanner(
  onActiveBackHandlerChange?: (handler: (() => boolean) | null) => void
) {
  let capturedProps: ScannerProps | null = null;

  function ScannerProbe(props: ScannerProps) {
    capturedProps = props;
    return <View testID="scanner-boundary" />;
  }

  render(
    <ScannerShowcaseScreen
      onBack={jest.fn()}
      onActiveBackHandlerChange={onActiveBackHandlerChange}
      ScannerComponent={ScannerProbe}
    />,
    { wrapper: ThemeProvider }
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

  it('外观选项通过真实父 ThemeProvider 交给 Scanner', () => {
    function ScannerAppearance() {
      const { scheme, fontScale } = useTheme();
      return <Text>{`${scheme}:${fontScale}`}</Text>;
    }
    render(
      <ScannerShowcaseScreen
        onBack={jest.fn()}
        ScannerComponent={ScannerAppearance}
      />,
      { wrapper: ThemeProvider }
    );
    fireEvent.press(screen.getByRole('switch', { name: '深色主题' }));
    fireEvent.press(screen.getByRole('switch', { name: '大字号' }));
    fireEvent.press(screen.getByRole('button', { name: '进入全屏 Scanner' }));
    expect(screen.getByText('dark:1.5')).toBeOnTheScreen();
  });

  it('active 时只渲染 Scanner 边界并复用共享 adapter', () => {
    const { getScannerProps } = renderWithScanner();

    fireEvent.press(screen.getByRole('button', { name: '进入全屏 Scanner' }));

    expect(screen.getByTestId('scanner-boundary')).toBeOnTheScreen();
    expect(screen.queryByText('Scanner 配置')).toBeNull();
    expect(getScannerProps()?.pickImage).toBe(pickLocalImage);
  });

  it('Scanner onClose 返回配置页', () => {
    const { getScannerProps } = renderWithScanner();
    fireEvent.press(screen.getByRole('button', { name: '进入全屏 Scanner' }));

    act(() => {
      getScannerProps()?.onClose?.();
    });

    expect(screen.getByText('Scanner 配置')).toBeOnTheScreen();
  });

  it('只在 Scanner active 生命周期向 Router 注册可消费的 back handler', () => {
    const onActiveBackHandlerChange = jest.fn();
    renderWithScanner(onActiveBackHandlerChange);

    fireEvent.press(screen.getByRole('button', { name: '进入全屏 Scanner' }));

    expect(onActiveBackHandlerChange).toHaveBeenLastCalledWith(
      expect.any(Function)
    );
    const activeBackHandler = onActiveBackHandlerChange.mock.calls.at(-1)?.[0];

    act(() => {
      expect(activeBackHandler?.()).toBe(true);
    });

    expect(screen.getByText('Scanner 配置')).toBeOnTheScreen();
    expect(onActiveBackHandlerChange).toHaveBeenLastCalledWith(null);
  });

  it('保存普通 ScanFailure，并可从 Scanner 返回后查看', () => {
    const { getScannerProps } = renderWithScanner();
    fireEvent.press(screen.getByRole('button', { name: '进入全屏 Scanner' }));

    act(() => {
      getScannerProps()?.onError?.(scanError);
      getScannerProps()?.onClose?.();
    });

    expect(screen.getByText('unavailable')).toBeOnTheScreen();
    expect(screen.getByText('相机初始化失败')).toBeOnTheScreen();
  });

  it.each([
    ['关闭', false],
    ['开启', true],
  ] as const)(
    'autoConfirm %s 路径都同步保存完整确认结果',
    (_label, enabled) => {
      const { getScannerProps } = renderWithScanner();

      if (enabled) {
        fireEvent.press(screen.getByRole('switch', { name: '自动确认' }));
      }
      fireEvent.press(screen.getByRole('button', { name: '进入全屏 Scanner' }));

      expect(getScannerProps()?.autoConfirm).toBe(enabled);
      act(() => {
        getScannerProps()?.onConfirm?.(milkTeaResult);
      });

      expect(screen.getByText('Scanner 配置')).toBeOnTheScreen();
      expect(screen.getByTestId('last-confirmed-json')).toHaveTextContent(
        JSON.stringify(milkTeaResult, null, 2)
      );
    }
  );

  it('配置页返回按钮调用上层路由', () => {
    const onBack = jest.fn();
    render(<ScannerShowcaseScreen onBack={onBack} />, {
      wrapper: ThemeProvider,
    });

    fireEvent.press(screen.getByRole('button', { name: '返回' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
