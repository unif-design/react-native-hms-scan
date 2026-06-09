/* eslint-disable @typescript-eslint/no-require-imports */
// Jest 环境没有原生侧，这里把会触碰原生的依赖替换成纯 JS 桩：
//   - react-native-svg：渲染成普通 View。
//   - @unif/react-native-design：渲染成轻量桩（避免 jest 加载 reanimated/手势等原生
//     依赖）。注意：tsc 仍用 design 的真实类型校验源码，本 mock 只影响 jest 运行时。
//   - 库自身的 Scanner 单测会再各自 mock HmsScanView / NativeHmsScan。

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const passthrough =
    (name: string) =>
    ({ children, ...props }: { children?: unknown }) =>
      React.createElement(View, { ...props, accessibilityLabel: name }, children);
  const Svg = passthrough('Svg');
  return {
    __esModule: true,
    default: Svg,
    Svg,
    Path: passthrough('Path'),
    Circle: passthrough('Circle'),
    Rect: passthrough('Rect'),
    G: passthrough('G'),
    Line: passthrough('Line'),
    Polyline: passthrough('Polyline'),
    Polygon: passthrough('Polygon'),
    Defs: passthrough('Defs'),
    LinearGradient: passthrough('LinearGradient'),
    Stop: passthrough('Stop'),
  };
});

jest.mock('@unif/react-native-design', () => {
  const React = require('react');
  const { View, Text, Pressable } = require('react-native');

  const colors = {
    primary: '#EB6E00',
    primaryPressed: '#D06200',
    onPrimary: '#FFFFFF',
    success: '#52C41A',
    error: '#F4511E',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    surfaceContainer: '#F5F5F5',
    surfaceContainerHighest: '#E0E0E0',
    foreground: '#333333',
    foregroundMuted: '#666666',
    foregroundSubtle: '#999999',
    outline: '#EDEDED',
    scrim: 'rgba(0,0,0,0.5)',
  };
  const shadow = { subtle: {}, card: {}, floating: {}, none: {} };

  const box =
    () =>
    ({ children, ...props }: { children?: unknown }) =>
      React.createElement(View, props, children);

  const Button = ({ label, onPress, ...props }: { label?: string; onPress?: () => void }) =>
    React.createElement(
      Pressable,
      { onPress, accessibilityRole: 'button', accessibilityLabel: label, ...props },
      React.createElement(Text, null, label)
    );

  const Empty = ({ title, desc }: { title?: string; desc?: string }) =>
    React.createElement(
      View,
      null,
      React.createElement(Text, null, title),
      desc ? React.createElement(Text, null, desc) : null
    );

  const Avatar = ({ label }: { label?: string }) =>
    React.createElement(View, null, React.createElement(Text, null, label));

  const IconButton = ({
    onPress,
    accessibilityLabel,
    ...props
  }: {
    onPress?: () => void;
    accessibilityLabel?: string;
  }) =>
    React.createElement(Pressable, {
      onPress,
      accessibilityRole: 'button',
      accessibilityLabel,
      ...props,
    });

  const toast = Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  });

  return {
    __esModule: true,
    // theme
    useColors: () => colors,
    useShadow: () => shadow,
    useTheme: () => ({ scheme: 'light', colors, shadow }),
    useThemedStyles: (maker: (c: unknown, s: unknown) => unknown) => maker(colors, shadow),
    ThemeProvider: ({ children }: { children?: unknown }) => children,
    lightColors: colors,
    darkColors: colors,
    lightShadow: shadow,
    darkShadow: shadow,
    // tokens / scale
    r: (n: number) => n,
    rf: (n: number) => n,
    fw: { regular: '400', medium: '500', semi: '600', bold: '700', heavy: '800' },
    fontMono: 'monospace',
    space: {},
    radius: {},
    type: {},
    control: {},
    motion: {},
    // feedback
    toast,
    ToastHost: () => null,
    // components
    Icon: box(),
    IconButton,
    Button,
    Card: box(),
    Avatar,
    Empty,
    Spinner: box(),
    StatusDot: box(),
  };
});
