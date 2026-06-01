import { Text, View } from 'react-native';
import { colors, radius } from './tokens';

/** 商品字母牌（方角圆角块 + 首字）。设计用品牌渐变，这里用纯主色近似。 */
export function Monogram({ char, size = 44 }: { char: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.xl,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: colors.onPrimary,
          fontSize: Math.round(size * 0.42),
          fontWeight: '700',
          letterSpacing: 1,
        }}
      >
        {char}
      </Text>
    </View>
  );
}
