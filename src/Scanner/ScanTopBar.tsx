import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from './tokens';
import { Icon } from './Icon';

interface ScanTopBarProps {
  title: string;
  topInset: number;
  onClose?: () => void;
  trailing?: ReactNode;
}

// 顶栏：关闭键 · 标题 · 尾部插槽。叠在相机预览之上（深色背景，故文字/图标为白）。
// 注：设计稿用了 backdrop-filter 毛玻璃，RN 无内建模糊（需额外原生库），此处以半透明底近似。
export function ScanTopBar({ title, topInset, onClose, trailing }: ScanTopBarProps) {
  return (
    <View style={[styles.bar, { paddingTop: topInset }]} pointerEvents="box-none">
      <Pressable
        onPress={onClose}
        hitSlop={8}
        style={({ pressed }) => [styles.disc, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="关闭"
      >
        <Icon name="close" size={20} stroke={2} color={colors.onPrimary} />
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
    paddingHorizontal: 14,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  disc: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glassDark,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
  },
  pressed: { opacity: 0.6 },
  title: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  trailing: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
