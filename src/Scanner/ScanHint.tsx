import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from './tokens';

interface ScanHintProps {
  detecting: boolean;
  /** 取景态提示文案。 */
  text: string;
}

// 取景框下方提示。识别中显示白色小转圈 + "识别中…"。
export function ScanHint({ detecting, text }: ScanHintProps) {
  return (
    <View style={styles.row}>
      {detecting && (
        <ActivityIndicator size="small" color={colors.onPrimary} style={styles.spinner} />
      )}
      <Text style={styles.text}>{detecting ? '识别中…' : text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 7,
  },
  spinner: {
    transform: [{ scale: 0.85 }],
  },
  text: {
    color: colors.hintWhite,
    fontSize: 13.5,
    fontWeight: '500',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
