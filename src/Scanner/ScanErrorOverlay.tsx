import { StyleSheet, View } from 'react-native';
import {
  Button,
  Empty,
  useThemedStyles,
  r,
  type ColorTokens,
} from '@unif/react-native-design';

interface ScanErrorOverlayProps {
  onClose?: () => void;
  onRetry: () => void;
}

export function ScanErrorOverlay({ onClose, onRetry }: ScanErrorOverlayProps) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.overlay}>
      <Empty
        icon="error-alert"
        title="相机启动失败"
        desc="无法启动扫码相机，请确认权限与设备状态后重试。"
      />
      <View style={styles.row}>
        {onClose && <Button label="取消" variant="ghost" block onPress={onClose} />}
        <Button label="重试" variant="primary" block onPress={onRetry} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', columnGap: r(12), marginTop: r(8) },
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
