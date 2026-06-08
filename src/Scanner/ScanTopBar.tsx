import { StyleSheet, Text, View } from 'react-native';
import { r, rf, fw } from '@unif/react-native-design';
import { scanChrome } from './scanChrome';

interface ScanTopBarProps {
  title: string;
  topInset: number;
}

// 顶栏：仅居中标题。关闭键已移到底部工具栏，与手电筒并排（见 ScanToolbar）。
// 叠在深色相机预览之上，故文字恒为白（不随主题）。
export function ScanTopBar({ title, topInset }: ScanTopBarProps) {
  return (
    <View style={[styles.bar, { paddingTop: topInset }]} pointerEvents="box-none">
      <Text style={styles.title}>{title}</Text>
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
    justifyContent: 'center',
  },
  title: {
    color: scanChrome.white,
    fontSize: rf(16),
    fontWeight: fw.semi,
    letterSpacing: 0.2,
    textShadowColor: scanChrome.textShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
