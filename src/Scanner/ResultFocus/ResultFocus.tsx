import { ScrollView, Text, View } from 'react-native';
import {
  Button,
  GlassLayer,
  useThemedStyles,
  r,
} from '@unif/react-native-design';
import type { ResultFocusProps } from './types';
import { styles, makeStyles } from './styles';

/** A raw result is selected here; interpreting it belongs to the consumer. */
export function ResultFocus({
  result,
  bottomInset,
  onRescan,
  onConfirm,
}: ResultFocusProps) {
  const themed = useThemedStyles(makeStyles);
  return (
    <View style={[styles.wrap, themed.shadow, { bottom: bottomInset + r(18) }]}>
      <View style={[styles.surface, themed.border]}>
        <GlassLayer style={styles.glass} testID="scan-result-glass" />
        <Text style={themed.badge}>已识别</Text>
        <Text style={themed.format}>{result.format}</Text>
        <ScrollView style={styles.content}>
          <Text selectable style={themed.value}>
            {result.value}
          </Text>
        </ScrollView>
        <View style={styles.actions}>
          <Button label="重扫" variant="secondary" block onPress={onRescan} />
          <Button label="选用" variant="primary" block onPress={onConfirm} />
        </View>
      </View>
    </View>
  );
}
