import { AppState, StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  GlassLayer,
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
      <Scanner
        title="扫码标题"
        hintText="扫码提示"
        onClose={onClose}
        onConfirm={jest.fn()}
      />
    </ThemeProvider>
  );
  const camera = await screen.findByTestId('native-scan-boundary');
  expect(textStyle('扫码标题').fontSize).toBeCloseTo(rf(16) * 1.5);
  expect(textStyle('扫码标题').letterSpacing).toBeCloseTo(0.2 * 1.5);
  expect(textStyle('扫码提示').fontSize).toBeCloseTo(rf(13.5) * 1.5);
  expect(textStyle('返回').fontSize).toBeCloseTo(rf(12) * 1.5);
  expect(textStyle('手电筒').fontSize).toBeCloseTo(rf(12) * 1.5);
  for (const layer of screen.getAllByTestId('scan-toolbar-glass', {
    includeHiddenElements: true,
  })) {
    expect(layer).toHaveStyle({ backgroundColor: darkColors.surface });
    expect(layer.props.pointerEvents).toBe('none');
  }
  const previewStyle = camera.props.style;
  const titleColor = textStyle('扫码标题').color;
  fireEvent.press(screen.getByRole('button', { name: '手电筒' }));
  expect(camera.props.torch).toBe(true);
  fireEvent(camera, 'torchState', {
    nativeEvent: {
      on: true,
      available: true,
      hasAvailable: true,
      hasLowLight: false,
      lowLight: false,
    },
  });
  page.rerender(
    <ThemeProvider forceScheme="light" fontScale={1.25}>
      <Scanner
        title="新标题"
        hintText="新提示"
        onClose={onClose}
        onConfirm={jest.fn()}
      />
    </ThemeProvider>
  );
  expect(textStyle('新标题').fontSize).toBeCloseTo(rf(16) * 1.25);
  expect(textStyle('新提示').fontSize).toBeCloseTo(rf(13.5) * 1.25);
  expect(textStyle('已开灯').fontSize).toBeCloseTo(rf(12) * 1.25);
  expect(textStyle('新标题').color).toBe(titleColor);
  expect(
    screen.getByTestId('scan-toolbar-glass', { includeHiddenElements: true })
  ).toHaveStyle({
    backgroundColor: darkColors.surface,
  });
  expect(camera.props.style).toEqual(previewStyle);
  expect(camera.props.torch).toBe(true);
  expect(mockMounted).toHaveBeenCalledTimes(1);
  expect(mockUnmounted).not.toHaveBeenCalled();
  expect(NativeHmsScan!.getCameraPermissionStatus).toHaveBeenCalledTimes(1);
  expect(NativeHmsScan!.requestCameraPermission).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: '返回' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('结果卡继承父主题和字号，更新外观保留待确认结果', async () => {
  const onConfirm = jest.fn();
  const page = render(
    <ThemeProvider forceScheme="dark" fontScale={1.5}>
      <Scanner onConfirm={onConfirm} />
    </ThemeProvider>
  );
  await screen.findByTestId('native-scan-boundary');
  await detect();
  expect(
    screen.getByRole('button', { name: '重扫' }).findAllByType(GlassLayer)
  ).toHaveLength(1);
  expect(
    screen.getByTestId('scan-result-glass', { includeHiddenElements: true })
  ).toHaveStyle({
    backgroundColor: darkColors.surface,
  });
  expect(
    screen.getByTestId('scan-result-glass', { includeHiddenElements: true })
      .props.pointerEvents
  ).toBe('none');
  expect(textStyle('6901234')).toMatchObject({
    color: darkColors.foreground,
    fontSize: rf(16) * 1.5,
    lineHeight: rf(21) * 1.5,
  });
  page.rerender(
    <ThemeProvider forceScheme="light" fontScale={1.25}>
      <Scanner onConfirm={onConfirm} />
    </ThemeProvider>
  );
  expect(
    screen.getByTestId('scan-result-glass', { includeHiddenElements: true })
  ).toHaveStyle({
    backgroundColor: lightColors.surface,
  });
  expect(textStyle('6901234').fontSize).toBeCloseTo(rf(16) * 1.25);
  expect(screen.getByTestId('native-scan-boundary').props.paused).toBe(true);
  expect(onConfirm).not.toHaveBeenCalled();
  expect(NativeHmsScan!.getCameraPermissionStatus).toHaveBeenCalledTimes(1);
  expect(mockMounted).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByRole('button', { name: '重扫' }));
  expect(screen.queryByText('6901234')).toBeNull();
  expect(screen.getByTestId('native-scan-boundary').props.paused).toBe(false);
  expect(onConfirm).not.toHaveBeenCalled();
  await detect();
  fireEvent.press(screen.getByRole('button', { name: '选用' }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
});

test('无结果浮层跟随主题回退，切换外观不重复读图且重扫仍可操作', async () => {
  const pickImage = jest.fn(async () => ({ uri: 'file:///empty.jpg' }));
  const onConfirm = jest.fn();
  const page = render(
    <ThemeProvider forceScheme="dark">
      <Scanner pickImage={pickImage} onConfirm={onConfirm} />
    </ThemeProvider>
  );
  await screen.findByTestId('native-scan-boundary');
  await act(async () =>
    fireEvent.press(screen.getByRole('button', { name: '相册' }))
  );
  expect(screen.getByText('未识别到条码')).toBeTruthy();
  expect(
    screen.getByTestId('scan-failure-glass', { includeHiddenElements: true })
  ).toHaveStyle({
    backgroundColor: darkColors.surface,
  });
  expect(
    screen.getByTestId('scan-failure-glass', { includeHiddenElements: true })
      .props.pointerEvents
  ).toBe('none');
  page.rerender(
    <ThemeProvider forceScheme="light">
      <Scanner pickImage={pickImage} onConfirm={onConfirm} />
    </ThemeProvider>
  );
  expect(
    screen.getByTestId('scan-failure-glass', { includeHiddenElements: true })
  ).toHaveStyle({
    backgroundColor: lightColors.surface,
  });
  expect(pickImage).toHaveBeenCalledTimes(1);
  expect(NativeHmsScan!.decodeImage).toHaveBeenCalledTimes(1);
  expect(onConfirm).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: '重扫' }));
  expect(screen.queryByText('未识别到条码')).toBeNull();
  expect(screen.getByTestId('native-scan-boundary').props.paused).toBe(false);
});

test('没有父 Provider 时使用 Design 默认主题和字号', async () => {
  render(<Scanner onConfirm={jest.fn()} />);
  await screen.findByTestId('native-scan-boundary');
  expect(textStyle('扫一扫').fontSize).toBe(rf(16));
  await detect();
  expect(textStyle('6901234').fontSize).toBe(rf(16));
  expect(textStyle('6901234').color).toBe(lightColors.foreground);
});

test('Scanner reads real parent safe-area values and allows explicit overrides', async () => {
  const { SafeAreaProvider } = require('react-native-safe-area-context');
  const { ScanTopBar } = require('../Scanner/ScanTopBar');
  const { ScanToolbar } = require('../Scanner/ScanToolbar');
  const wrap = (topInset?: number) => (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 320, height: 640 },
        insets: { top: 19, bottom: 11, left: 0, right: 0 },
      }}
    >
      <Scanner topInset={topInset} onConfirm={jest.fn()} />
    </SafeAreaProvider>
  );
  const page = render(wrap());
  await screen.findByTestId('native-scan-boundary');
  expect(screen.UNSAFE_getByType(ScanTopBar).props.topInset).toBe(19);
  expect(screen.UNSAFE_getByType(ScanToolbar).props.bottomInset).toBe(11);
  page.rerender(wrap(7));
  expect(screen.UNSAFE_getByType(ScanTopBar).props.topInset).toBe(7);
  expect(mockMounted).toHaveBeenCalledTimes(1);
});
