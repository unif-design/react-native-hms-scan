/* eslint-disable @typescript-eslint/no-require-imports */
// Jest 环境没有原生侧，这里把会触碰原生的依赖替换成纯 JS 桩：
//   - react-native-svg：渲染成普通 View，避免 svg 的 transform/原生依赖。
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
