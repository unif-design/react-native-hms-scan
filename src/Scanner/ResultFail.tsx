import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow } from './tokens';
import { Icon } from './Icon';

interface ResultFailProps {
  bottomInset: number;
  onRetry: () => void;
}

// 未识别失败的底部弹层（聚焦款不加背景遮罩，与浮层确认卡保持一致）。
export function ResultFail({ bottomInset, onRetry }: ResultFailProps) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [anim]);

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [320, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.grabber} />
      <View style={[styles.inner, { paddingBottom: bottomInset + 14 }]}>
        <View style={styles.center}>
          <View style={styles.errCircle}>
            <Icon name="warning" size={30} color={colors.error} />
          </View>
          <Text style={styles.title}>未识别到条码</Text>
          <Text style={styles.desc}>请将条码完整置于框内、保持平整并对准光线后重试。</Text>
        </View>
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
        >
          <Icon name="retry" size={18} stroke={2} color={colors.onPrimary} />
          <Text style={styles.btnText}>重新扫描</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...shadow.sheet,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.grabber,
    alignSelf: 'center',
    marginTop: 10,
  },
  inner: { paddingHorizontal: 18, paddingTop: 20 },
  center: { alignItems: 'center', rowGap: 12, paddingTop: 8, paddingBottom: 18 },
  errCircle: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '600', color: colors.foreground },
  desc: {
    fontSize: 13.5,
    color: colors.foregroundMuted,
    lineHeight: 20,
    maxWidth: 260,
    textAlign: 'center',
  },
  btn: {
    height: 48,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 6,
  },
  btnText: { fontSize: 15.5, fontWeight: '600', color: colors.onPrimary },
});
