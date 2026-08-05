import { StyleSheet, Text, View } from 'react-native';
import {
  Segmented,
  fw,
  space,
  type,
  type ColorTokens,
  useThemedStyles,
} from '@unif/react-native-design';
import type { FormatPresetId } from './formatPresets';

type FormatSelectorProps = {
  value: FormatPresetId;
  onChange: (value: FormatPresetId) => void;
  disabled?: boolean;
};

const formatItems = [
  { id: 'all', label: '全部' },
  { id: 'qr', label: '二维码' },
  { id: 'retail', label: '商品条码' },
];

export function FormatSelector({
  value,
  onChange,
  disabled,
}: FormatSelectorProps) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.group}>
      <Text style={styles.label}>识别码制</Text>
      <Segmented
        value={value}
        items={formatItems}
        disabled={disabled}
        onChange={(id) => onChange(id as FormatPresetId)}
        testID="format-selector"
      />
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    group: {
      rowGap: space['3'],
    },
    label: {
      color: colors.foreground,
      fontSize: type.sm,
      fontWeight: fw.semi,
    },
  });
