import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors, radius } from './tokens';
import { Icon } from './Icon';
import { ScanHint } from './ScanHint';

interface ViewfinderProps {
  /** 取景窗边长（px）。窗高 = size × 0.82。 */
  size: number;
  /** 识别中（停止呼吸/脉冲动画，准星与边框变淡）。 */
  detecting: boolean;
  /** 取景态提示文案。 */
  hintText: string;
}

// 聚焦款取景：圆角窗 + 白描边 + 橙色脉冲准星环 + 中心十字。
// 窗外暗化用「上 / 中(左+窗+右) / 下」三段布局还原（等价于设计稿的 box-shadow 挖洞）。
export function Viewfinder({ size, detecting, hintText }: ViewfinderProps) {
  const windowH = Math.round(size * 0.82);
  const scale = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (detecting) {
      scale.setValue(1);
      pulse.setValue(0.25);
      return;
    }
    const ease = Easing.inOut(Easing.ease);
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.012,
          duration: 1300,
          easing: ease,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 1300,
          easing: ease,
          useNativeDriver: true,
        }),
      ])
    );
    const reticle = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: 900,
          easing: ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: ease,
          useNativeDriver: true,
        }),
      ])
    );
    breathe.start();
    reticle.start();
    return () => {
      breathe.stop();
      reticle.stop();
    };
  }, [detecting, scale, pulse]);

  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* 上方暗化 */}
      <View style={styles.scrimFlexTop} />

      {/* 中间一行：左暗化 · 透明窗 · 右暗化 */}
      <View style={[styles.midRow, { height: windowH }]}>
        <View style={styles.scrimFlex} />
        <Animated.View
          style={{ width: size, height: windowH, transform: [{ scale }] }}
        >
          {/* 白色外边框 */}
          <View style={styles.windowBorder} />
          {/* 橙色脉冲准星环 */}
          <Animated.View style={[styles.reticle, { opacity: pulse }]} />
          {/* 中心十字 */}
          <View style={styles.crosshair}>
            <Icon
              name="scan"
              size={30}
              stroke={1.6}
              color="rgba(255,255,255,0.9)"
            />
          </View>
        </Animated.View>
        <View style={styles.scrimFlex} />
      </View>

      {/* 下方暗化（提示文案置于其顶部，紧贴窗下） */}
      <View style={styles.scrimFlexBottom}>
        <ScanHint detecting={detecting} text={hintText} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 15,
  },
  // 上:下 = 1:1.35，使取景窗略高于屏幕中线（对应设计稿 paddingBottom 80 的上移）
  scrimFlexTop: { flex: 1, backgroundColor: colors.scrim },
  scrimFlexBottom: {
    flex: 1.35,
    backgroundColor: colors.scrim,
    alignItems: 'center',
  },
  midRow: { flexDirection: 'row' },
  scrimFlex: { flex: 1, backgroundColor: colors.scrim },
  windowBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.window,
    borderWidth: 1.5,
    borderColor: colors.chromeWhite,
  },
  reticle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.window,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  crosshair: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 30,
    height: 30,
    marginTop: -15,
    marginLeft: -15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
