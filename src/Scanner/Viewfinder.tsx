import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Icon, useColors, r } from '@unif/react-native-design';
import { scanChrome } from './scanChrome';
import { ScanHint } from './ScanHint';

interface ViewfinderProps {
  /** 取景窗边长（px）。窗高 = size × 0.82。 */
  size: number;
  /** 识别中（停止呼吸/脉冲动画，准星与边框变淡）。 */
  detecting: boolean;
  /** 取景态提示文案。 */
  hintText: string;
}

// 取景窗圆角半径——窗口本体、白描边、脉冲准星环三者必须一致，圆角才严丝合缝。
const WINDOW_RADIUS = r(22);

// 聚焦款取景：圆角窗 + 白描边 + 主题主色脉冲准星环 + 中心十字（design 的 scan 图标）。
// 窗外暗化用窗口自身一圈超大 spread 的 boxShadow（blur 0 → 硬边纯色，向四周铺满主题 scrim）。
// 这样「洞」直接带圆角、与圆角描边对齐；旧版用「上/中(左+窗+右)/下」三段挖的是矩形洞，
// 四角会漏出未暗化的实景三角、与圆角描边错位（即「框四周没 radius」的观感来源）。
export function Viewfinder({ size, detecting, hintText }: ViewfinderProps) {
  const c = useColors();
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
        Animated.timing(scale, { toValue: 1.012, duration: 1300, easing: ease, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 1300, easing: ease, useNativeDriver: true }),
      ])
    );
    const reticle = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.55, duration: 900, easing: ease, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: ease, useNativeDriver: true }),
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
      {/* 上:下 = 1:1.35，使取景窗略高于屏幕中线 */}
      <View style={styles.spacerTop} />

      <Animated.View
        style={[
          styles.window,
          {
            width: size,
            height: windowH,
            transform: [{ scale }],
            // spread 铺满全屏的纯色硬边阴影 = 圆角洞之外的暗化遮罩（blur 0 → 不晕开）。
            boxShadow: [
              { offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 9999, color: c.scrim },
            ],
          },
        ]}
      >
        <View style={styles.windowBorder} />
        <Animated.View
          style={[styles.reticle, { borderColor: c.primary, opacity: pulse }]}
        />
        <View style={styles.crosshair}>
          <Icon name="scan" size={r(30)} color={scanChrome.crosshair} />
        </View>
      </Animated.View>

      <View style={styles.spacerBottom}>
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
    alignItems: 'center',
  },
  spacerTop: { flex: 1 },
  spacerBottom: { flex: 1.35, alignItems: 'center' },
  window: { borderRadius: WINDOW_RADIUS },
  windowBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: WINDOW_RADIUS,
    borderWidth: 1.5,
    borderColor: scanChrome.windowBorder,
  },
  reticle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: WINDOW_RADIUS,
    borderWidth: 2,
  },
  crosshair: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: r(30),
    height: r(30),
    marginTop: r(-15),
    marginLeft: r(-15),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
