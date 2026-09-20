import { AppState, StyleSheet, View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  Card,
  ThemeProvider,
  darkColors,
  lightColors,
  rf,
} from '@unif/react-native-design';
import { Scanner } from '@unif/react-native-hms-scan';
import NativeHmsScan from '../NativeHmsScan';

const mockMounted = jest.fn();
const mockUnmounted = jest.fn();

jest.mock('../NativeHmsScan', () => ({
  __esModule: true,
  default: {
    getCameraPermissionStatus: jest.fn(async () => 'granted'),
    requestCameraPermission: jest.fn(async () => 'granted'),
    decodeImage: jest.fn(async () => '[]'),
  },
}));

jest.mock('../HmsScanViewNativeComponent', () => {
  const ReactModule = require('react') as typeof import('react');
  const { View: NativeView } =
    require('react-native') as typeof import('react-native');
  return {
    __esModule: true,
    default: function NativeScanView(props: Record<string, unknown>) {
      ReactModule.useEffect(() => {
        mockMounted();
        return () => mockUnmounted();
      }, []);
      return ReactModule.createElement(NativeView, {
        ...props,
        testID: 'native-scan-boundary',
      });
    },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .spyOn(AppState, 'addEventListener')
    .mockReturnValue({ remove: jest.fn() });
});
afterEach(() => jest.restoreAllMocks());

const textStyle = (label: string) =>
  StyleSheet.flatten(screen.getByText(label).props.style);

async function detect() {
  await act(async () => {
    fireEvent(screen.getByTestId('native-scan-boundary'), 'scanResult', {
      nativeEvent: {
        resultsJson: JSON.stringify([{ value: '6901234', format: 'EAN_13' }]),
      },
    });
  });
}

test('公开 Scanner 跟随父主题和字号一次，更新外观保留原生实例与手电状态', async () => {
  const onClose = jest.fn();
  const page = render(
    <ThemeProvider forceScheme="dark" fontScale={1.5}>
      <Scanner title="扫码标题" hintText="扫码提示" onClose={onClose} />
    </ThemeProvider>
  );
  const camera = await screen.findByTestId('native-scan-boundary');
  expect(textStyle('扫码标题').fontSize).toBeCloseTo(rf(16) * 1.5);
  expect(textStyle('扫码标题').letterSpacing).toBeCloseTo(0.2 * 1.5);
  expect(textStyle('扫码提示').fontSize).toBeCloseTo(rf(13.5) * 1.5);
  expect(textStyle('返回').fontSize).toBeCloseTo(rf(12) * 1.5);
  expect(textStyle('手电筒').fontSize).toBeCloseTo(rf(12) * 1.5);
  const previewStyle = camera.props.style;
  const titleColor = textStyle('扫码标题').color;
  fireEvent.press(screen.getByRole('button', { name: '手电筒' }));
  expect(camera.props.torch).toBe(true);
  page.rerender(
    <ThemeProvider forceScheme="light" fontScale={1.25}>
      <Scanner title="新标题" hintText="新提示" onClose={onClose} />
    </ThemeProvider>
  );
  expect(textStyle('新标题').fontSize).toBeCloseTo(rf(16) * 1.25);
  expect(textStyle('新提示').fontSize).toBeCloseTo(rf(13.5) * 1.25);
  expect(textStyle('已开灯').fontSize).toBeCloseTo(rf(12) * 1.25);
  expect(textStyle('新标题').color).toBe(titleColor);
  expect(camera.props.style).toEqual(previewStyle);
  expect(camera.props.torch).toBe(true);
  expect(mockMounted).toHaveBeenCalledTimes(1);
  expect(mockUnmounted).not.toHaveBeenCalled();
  expect(NativeHmsScan.getCameraPermissionStatus).toHaveBeenCalledTimes(1);
  expect(NativeHmsScan.requestCameraPermission).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: '返回' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('结果卡继承父主题和字号，更新外观保留待确认结果', async () => {
  const onConfirm = jest.fn();
  const resolveProduct = jest.fn(async () => ({ name: '测试商品' }));
  const page = render(
    <ThemeProvider forceScheme="dark" fontScale={1.5}>
      <Scanner onConfirm={onConfirm} resolveProduct={resolveProduct} />
    </ThemeProvider>
  );
  await screen.findByTestId('native-scan-boundary');
  await detect();
  const cardStyle = () => {
    const frame = screen.UNSAFE_getByType(Card).findAllByType(View)[0];
    if (!frame) throw new Error('结果卡缺少内容框');
    return StyleSheet.flatten(frame.props.style);
  };
  expect(cardStyle().backgroundColor).toBe(darkColors.surface);
  expect(textStyle('测试商品')).toMatchObject({
    color: darkColors.foreground,
    fontSize: rf(16) * 1.5,
    lineHeight: rf(21) * 1.5,
  });
  page.rerender(
    <ThemeProvider forceScheme="light" fontScale={1.25}>
      <Scanner onConfirm={onConfirm} resolveProduct={resolveProduct} />
    </ThemeProvider>
  );
  expect(cardStyle().backgroundColor).toBe(lightColors.surface);
  expect(textStyle('测试商品').fontSize).toBeCloseTo(rf(16) * 1.25);
  expect(screen.getByTestId('native-scan-boundary').props.paused).toBe(true);
  expect(resolveProduct).toHaveBeenCalledTimes(1);
  expect(onConfirm).not.toHaveBeenCalled();
  expect(NativeHmsScan.getCameraPermissionStatus).toHaveBeenCalledTimes(1);
  expect(mockMounted).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByRole('button', { name: '确定' }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
});

test('没有父 Provider 时使用 Design 默认主题和字号', async () => {
  render(<Scanner resolveProduct={async () => ({ name: '默认商品' })} />);
  await screen.findByTestId('native-scan-boundary');
  expect(textStyle('扫一扫').fontSize).toBe(rf(16));
  await detect();
  expect(textStyle('默认商品').fontSize).toBe(rf(16));
  expect(textStyle('默认商品').color).toBe(lightColors.foreground);
});
