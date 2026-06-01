import { StyleSheet, View } from 'react-native';
import {
  Button,
  Empty,
  useThemedStyles,
  r,
  type ColorTokens,
} from '@unif/react-native-design';

interface DeniedOverlayProps {
  onClose?: () => void;
  onSettings: () => void;
}

// 相机权限未授权态：无相机可显示，故用主题背景的全屏空态（与 react-native-camera 的 NoPermission 一致）。
export function DeniedOverlay({ onClose, onSettings }: DeniedOverlayProps) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.overlay}>
      <Empty
        icon="permission-denied"
        title="需要相机权限"
        desc="开启相机后，才能扫描商品条码与门店二维码。请前往系统设置授权。"
      />
      <View style={styles.row}>
        {onClose && <Button label="取消" variant="ghost" onPress={onClose} style={styles.btn} />}
        <Button
          label="去设置开启"
          variant="primary"
          leftIcon="settings"
          onPress={onSettings}
          style={styles.btn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', columnGap: r(12), marginTop: r(8) },
  btn: { flex: 1 },
});

const makeStyles = (c: ColorTokens) =>
  StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 40,
      backgroundColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: r(40),
      rowGap: r(8),
    },
  });
