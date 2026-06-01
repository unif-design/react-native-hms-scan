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

// 聚焦款取景：圆角窗 + 白描边 + 主题主色脉冲准星环 + 中心十字（design 的 scan 图标）。
// 窗外暗化用「上 / 中(左+窗+右) / 下」三段布局还原（等价于设计稿 box-shadow 挖洞）。
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

  const scrim = { backgroundColor: c.scrim };

  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={[styles.scrimTop, scrim]} />

      <View style={[styles.midRow, { height: windowH }]}>
        <View style={[styles.scrimSide, scrim]} />
        <Animated.View style={{ width: size, height: windowH, transform: [{ scale }] }}>
          <View style={styles.windowBorder} />
          <Animated.View
            style={[styles.reticle, { borderColor: c.primary, opacity: pulse }]}
          />
          <View style={styles.crosshair}>
            <Icon name="scan" size={r(30)} color={scanChrome.crosshair} />
          </View>
        </Animated.View>
        <View style={[styles.scrimSide, scrim]} />
      </View>

      <View style={[styles.scrimBottom, scrim]}>
        <ScanHint detecting={detecting} text={hintText} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 15 },
  // 上:下 = 1:1.35，使取景窗略高于屏幕中线
  scrimTop: { flex: 1 },
  scrimBottom: { flex: 1.35, alignItems: 'center' },
  midRow: { flexDirection: 'row' },
  scrimSide: { flex: 1 },
  windowBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: r(22),
    borderWidth: 1.5,
    borderColor: scanChrome.windowBorder,
  },
  reticle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: r(22),
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
