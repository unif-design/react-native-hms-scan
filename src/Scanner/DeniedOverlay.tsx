import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from './tokens';
import { Icon } from './Icon';

interface DeniedOverlayProps {
  onSettings: () => void;
}

// 相机权限未授权遮罩（全屏深色）。
export function DeniedOverlay({ onSettings }: DeniedOverlayProps) {
  return (
    <View style={styles.overlay}>
      <View style={styles.iconCircle}>
        <Icon name="camera" size={34} stroke={1.6} color="rgba(255,255,255,0.7)" />
      </View>
      <Text style={styles.title}>需要相机权限</Text>
      <Text style={styles.desc}>
        开启相机后，才能扫描商品条码与门店二维码。请前往系统设置授权。
      </Text>
      <Pressable
        onPress={onSettings}
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
      >
        <Icon name="settings" size={20} color={colors.onPrimary} />
        <Text style={styles.btnText}>去设置开启</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    backgroundColor: colors.cameraBg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  title: {
    color: colors.onPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  desc: {
    color: 'rgba(235,235,245,0.6)',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 26,
  },
  btn: {
    height: 48,
    paddingHorizontal: 28,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
  },
  btnText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
});
