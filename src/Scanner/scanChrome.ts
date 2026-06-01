// 相机暗景之上的 chrome 专属常量——取景区恒为深色实景，这些不随主题变化。
// 其余颜色一律走 @unif/react-native-design 主题令牌（useColors / useThemedStyles）。
export const scanChrome = {
  /** 相机未就绪时的底色（深色实景占位）。 */
  cameraBg: '#0c0b0a',
  white: '#FFFFFF',
  /** 顶栏关闭键玻璃底。 */
  glassDisc: 'rgba(20,18,16,0.42)',
  /** 工具栏未点亮玻璃底。 */
  glassDisc2: 'rgba(28,26,24,0.5)',
  glassBorder: 'rgba(255,255,255,0.16)',
  glassBorderActive: 'rgba(255,255,255,0.25)',
  /** 取景提示文字。 */
  hintText: 'rgba(255,255,255,0.86)',
  toolbarLabel: 'rgba(255,255,255,0.82)',
  /** 取景窗白色描边。 */
  windowBorder: 'rgba(255,255,255,0.55)',
  crosshair: 'rgba(255,255,255,0.9)',
  textShadow: 'rgba(0,0,0,0.55)',
} as const;
