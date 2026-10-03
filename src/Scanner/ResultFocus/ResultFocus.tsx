import { ScrollView, Text, View } from 'react-native';
import {
  Button,
  Card,
  useColors,
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
  const colors = useColors();
  const themed = useThemedStyles(makeStyles);
  return (
    <View style={[styles.wrap, { bottom: bottomInset + r(18) }]}>
      <Card
        borderColor={colors.primary}
        borderWidth={2}
        borderRadius={r(16)}
        padding={r(14)}
      >
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
      </Card>
    </View>
  );
}
