import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from './tokens';
import { Icon } from './Icon';

interface ScanToolbarProps {
  flash: boolean;
  bottomInset: number;
  onFlash: () => void;
  onAlbum: () => void;
}

// 底部工具栏：手电筒 · 相册（按定稿，去掉了搜索 / 输入码）。
export function ScanToolbar({ flash, bottomInset, onFlash, onAlbum }: ScanToolbarProps) {
  return (
    <View
      style={[styles.bar, { bottom: bottomInset + 50 }]}
      pointerEvents="box-none"
    >
      <ToolbarItem
        icon={
          <Icon name="flash" size={23} color={colors.onPrimary} fill={flash} />
        }
        label={flash ? '已开灯' : '手电筒'}
        active={flash}
        onPress={onFlash}
      />
      <ToolbarItem
        icon={<Icon name="image" size={22} color={colors.onPrimary} />}
        label="相册"
        active={false}
        onPress={onAlbum}
      />
    </View>
  );
}

function ToolbarItem({
  icon,
  label,
  active,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.item}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {({ pressed }) => (
        <>
          <View
            style={[
              styles.circle,
              active ? styles.circleActive : styles.circleIdle,
              pressed && { opacity: 0.7 },
            ]}
          >
            {icon}
          </View>
          <Text style={styles.label}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    columnGap: 40,
  },
  item: {
    width: 72,
    alignItems: 'center',
    rowGap: 7,
  },
  circle: {
    width: 54,
    height: 54,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  circleIdle: {
    backgroundColor: colors.glassDark2,
    borderColor: colors.glassBorder,
  },
  circleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.glassBorderActive,
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.82)',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
