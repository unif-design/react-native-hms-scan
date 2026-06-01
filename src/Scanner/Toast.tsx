import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from './tokens';
import { Icon } from './Icon';

interface ToastProps {
  /** 文案；null/空 = 隐藏。 */
  text: string | null;
  topInset: number;
}

// 顶部成功 Toast（带勾），淡入淡出。text 由父级置空触发淡出。
export function Toast({ text, topInset }: ToastProps) {
  const anim = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState<string>('');

  useEffect(() => {
    if (text) {
      setShown(text);
      Animated.timing(anim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [text, anim]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        { top: topInset + 56 },
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [-8, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.toast}>
        <Icon name="check" size={17} stroke={2.4} color={colors.success} />
        <Text style={styles.text}>{shown}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 60,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    maxWidth: '80%',
    backgroundColor: colors.toastBg,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
  },
  text: { color: colors.onPrimary, fontSize: 13.5, fontWeight: '500' },
});
