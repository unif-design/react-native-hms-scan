import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, r, rf, fw } from '@unif/react-native-design';
import { scanChrome } from './scanChrome';

interface ScanTopBarProps {
  title: string;
  topInset: number;
  onClose?: () => void;
  trailing?: ReactNode;
}

// 顶栏：关闭键 · 标题 · 尾部插槽。叠在深色相机预览之上，故文字/图标恒为白（不随主题）。
// 设计稿用了毛玻璃，RN 无内建模糊，这里以半透明深色底近似（design 的 BlurLayer 需额外原生模糊库）。
export function ScanTopBar({ title, topInset, onClose, trailing }: ScanTopBarProps) {
  return (
    <View style={[styles.bar, { paddingTop: topInset }]} pointerEvents="box-none">
      <Pressable
        onPress={onClose}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="关闭"
        style={({ pressed }) => [styles.disc, pressed && styles.pressed]}
      >
        <Icon name="close" size={r(20)} color={scanChrome.white} />
      </Pressable>

      <Text style={styles.title}>{title}</Text>

      <View style={styles.trailing}>{trailing}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    paddingHorizontal: r(14),
    paddingBottom: r(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  disc: {
    width: r(38),
    height: r(38),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: scanChrome.glassDisc,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: scanChrome.glassBorder,
  },
  pressed: { opacity: 0.6 },
  title: {
    color: scanChrome.white,
    fontSize: rf(16),
    fontWeight: fw.semi,
    letterSpacing: 0.2,
    textShadowColor: scanChrome.textShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  trailing: {
    width: r(38),
    height: r(38),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
