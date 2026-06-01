import { StyleSheet, Text, View } from 'react-native';
import { Spinner, r, rf, fw } from '@unif/react-native-design';
import { scanChrome } from './scanChrome';

interface ScanHintProps {
  detecting: boolean;
  /** 取景态提示文案。 */
  text: string;
}

// 取景框下方提示。识别中显示 design 的 Spinner（白）+ "识别中…"。
export function ScanHint({ detecting, text }: ScanHintProps) {
  return (
    <View style={styles.row}>
      {detecting && <Spinner size={r(15)} color={scanChrome.white} />}
      <Text style={styles.text}>{detecting ? '识别中…' : text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: r(18),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: r(7),
  },
  text: {
    color: scanChrome.hintText,
    fontSize: rf(13.5),
    fontWeight: fw.medium,
    letterSpacing: 0.2,
    textShadowColor: scanChrome.textShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
