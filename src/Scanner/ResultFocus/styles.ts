import { StyleSheet } from 'react-native';
import {
  r,
  rf,
  fw,
  fontMono,
  type ColorTokens,
  type ShadowTokens,
} from '@unif/react-native-design';

export const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: r(16), right: r(16), zIndex: 50 },
  glass: { borderRadius: r(16) },
  surface: {
    borderRadius: r(16),
    borderWidth: 2,
    padding: r(14),
    overflow: 'hidden',
  },
  content: { maxHeight: r(220), marginVertical: r(14) },
  actions: { flexDirection: 'row', columnGap: r(10) },
});
export const makeStyles = (colors: ColorTokens, shadow: ShadowTokens) =>
  StyleSheet.create({
    shadow: { borderRadius: r(16), ...shadow.card },
    border: { borderColor: colors.primary },
    badge: { fontSize: rf(13), fontWeight: fw.semi, color: colors.foreground },
    format: {
      fontSize: rf(12),
      color: colors.foregroundMuted,
      fontFamily: fontMono,
      marginTop: r(4),
    },
    value: { fontSize: rf(16), lineHeight: rf(21), color: colors.foreground },
  });
