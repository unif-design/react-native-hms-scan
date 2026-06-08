import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import {
  Button,
  Empty,
  useThemedStyles,
  r,
  type ColorTokens,
  type ShadowTokens,
} from '@unif/react-native-design';

interface ResultFailProps {
  bottomInset: number;
  /** 重扫：回到取景重新扫描。（退出扫码页是外层工具栏「返回」的事。） */
  onRescan: () => void;
}

// 未识别失败的底部弹层：design 的 Empty（error-alert）+ Button（重扫）。
// 聚焦款不加背景遮罩，与浮层确认卡保持一致。
export function ResultFail({ bottomInset, onRescan }: ResultFailProps) {
  const s = useThemedStyles(makeStyles);
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [anim]);

  return (
    <Animated.View
      style={[
        s.sheet,
        { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [r(320), 0] }) }] },
      ]}
    >
      <View style={s.grabber} />
      <View style={[styles.inner, { paddingBottom: bottomInset + r(14) }]}>
        <Empty
          icon="error-alert"
          title="未识别到条码"
          desc="请将条码完整置于框内、保持平整并对准光线后重试。"
        />
        <Button label="重扫" variant="primary" block onPress={onRescan} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  inner: { paddingHorizontal: r(18), paddingTop: r(8), rowGap: r(16) },
});

const makeStyles = (c: ColorTokens, shadow: ShadowTokens) =>
  StyleSheet.create({
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 50,
      backgroundColor: c.surface,
      borderTopLeftRadius: r(20),
      borderTopRightRadius: r(20),
      paddingTop: r(10),
      ...shadow.floating,
    },
    grabber: {
      width: r(40),
      height: r(4),
      borderRadius: 999,
      backgroundColor: c.surfaceContainerHighest,
      alignSelf: 'center',
    },
  });
