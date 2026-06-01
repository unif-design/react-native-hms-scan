// 内联的浅色设计令牌（取自 Unif Design System colors_and_type.css，仅浅色）。
// 按用户要求只做浅色模式，故不依赖 @unif/react-native-design。

export const colors = {
  primary: '#EB6E00',
  primaryPressed: '#D06200',
  primaryContainer: '#FFF5EB',
  onPrimary: '#FFFFFF',

  success: '#52C41A',
  successContainer: '#F0FFF0',
  error: '#F4511E',
  errorContainer: '#FFF5F5',

  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceContainer: '#F5F5F5',
  grabber: '#E0E0E0',

  foreground: '#333333',
  foregroundMuted: '#666666',
  foregroundSubtle: '#999999',
  outline: '#EDEDED',

  scrim: 'rgba(0,0,0,0.5)',

  // 相机取景区（深色实景；相机未就绪时的底色）
  cameraBg: '#0c0b0a',

  // 扫码 chrome 上的半透明白（取景框边、提示字、工具栏文字）
  chromeWhite: 'rgba(255,255,255,0.55)',
  hintWhite: 'rgba(255,255,255,0.86)',
  // 玻璃按钮底（顶栏关闭键 / 工具栏未点亮）
  glassDark: 'rgba(20,18,16,0.42)',
  glassDark2: 'rgba(28,26,24,0.5)',
  glassBorder: 'rgba(255,255,255,0.16)',
  glassBorderActive: 'rgba(255,255,255,0.25)',
  toastBg: 'rgba(20,18,16,0.86)',
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  card: 16,
  window: 22,
  pill: 999,
} as const;

// 默认安全区（无 react-native-safe-area-context 依赖时的兜底，宿主可覆盖）
export const insets = {
  top: 54,
  bottom: 34,
} as const;

export const shadow = {
  // 浅色卡片阴影 0 1px 4px rgba(0,0,0,0.08)
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  // 橙色浮起卡阴影（聚焦款确认卡）0 8px 28px rgba(235,110,0,0.16)
  pop: {
    shadowColor: '#EB6E00',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  // 底部弹层阴影 0 -6px 24px rgba(0,0,0,0.12)
  sheet: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
} as const;
