import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import {
  Avatar,
  Button,
  Card,
  StatusDot,
  useColors,
  useThemedStyles,
  r,
  rf,
  fw,
  fontMono,
} from '@unif/react-native-design';
import type { ScanProduct } from '../types';

interface ResultFocusProps {
  product: ScanProduct;
  /** 识别耗时（ms），用于 "已识别 · 0.6s"。<=0 则只显示 "已识别"。 */
  detectMs: number;
  bottomInset: number;
  /** 重扫：放弃本次结果，回到取景重新扫描。（退出扫码页是外层工具栏「返回」的事。） */
  onRescan: () => void;
  /** 确定：确认本次结果并带回上一级。 */
  onConfirm: () => void;
}

// 聚焦款"浮层确认卡"：design Card + 2px 主色描边，悬浮在相机之上（无遮罩）。
export function ResultFocus({
  product,
  detectMs,
  bottomInset,
  onRescan,
  onConfirm,
}: ResultFocusProps) {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  }, [anim]);

  const brandChar = product.brandChar ?? (product.brand ?? product.name).charAt(0);
  const badge = detectMs > 0 ? `已识别 · ${(detectMs / 1000).toFixed(1)}s` : '已识别';
  const caption = product.priceCaption ?? '建议零售';

  return (
    <Animated.View
      style={[
        styles.wrap,
        { bottom: bottomInset + r(18) },
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [r(24), 0] }) }],
        },
      ]}
    >
      <Card borderColor={c.primary} borderWidth={2} borderRadius={r(16)} padding={r(14)}>
        {/* 头部：成功点 · 已识别 · 条码 */}
        <View style={styles.header}>
          <StatusDot status="done" size={r(20)} />
          <Text style={s.badge}>{badge}</Text>
          <View style={styles.spacer} />
          {!!product.barcode && <Text style={s.barcode}>{product.barcode}</Text>}
        </View>

        {/* 商品行 */}
        <View style={styles.body}>
          <Avatar label={brandChar} variant="brand" size="xl" />
          <View style={styles.info}>
            <Text style={s.name} numberOfLines={2}>
              {product.brand ? `${product.brand} ` : ''}
              {product.name}
            </Text>
            {!!(product.spec || product.stockShort) && (
              <Text style={s.sub} numberOfLines={1}>
                {[product.spec, product.stockShort ? `库存${product.stockShort}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            )}
          </View>
          {!!product.price && (
            <View style={styles.priceCol}>
              <Text style={s.price}>{product.price}</Text>
              <Text style={s.caption}>{caption}</Text>
            </View>
          )}
        </View>

        {/* 操作：重扫（回取景）· 确定（确认带回） */}
        <View style={styles.actions}>
          <Button label="重扫" variant="secondary" onPress={onRescan} style={styles.btn} />
          <Button label="确定" variant="primary" onPress={onConfirm} style={styles.btn} />
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: r(16), right: r(16), zIndex: 50 },
  header: { flexDirection: 'row', alignItems: 'center', columnGap: r(7), marginBottom: r(12) },
  spacer: { flex: 1 },
  body: { flexDirection: 'row', alignItems: 'center', columnGap: r(14), marginBottom: r(14) },
  info: { flex: 1, minWidth: 0 },
  priceCol: { alignItems: 'flex-end' },
  actions: { flexDirection: 'row', columnGap: r(10) },
  btn: { flex: 1 },
});

const makeStyles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    badge: { fontSize: rf(13), fontWeight: fw.semi, color: c.foreground },
    barcode: { fontSize: rf(12), color: c.foregroundSubtle, fontFamily: fontMono },
    name: { fontSize: rf(16), fontWeight: fw.semi, color: c.foreground, lineHeight: rf(21) },
    sub: { fontSize: rf(12.5), color: c.foregroundMuted, marginTop: r(4) },
    price: { fontSize: rf(24), fontWeight: fw.heavy, color: c.primary, lineHeight: rf(24) },
    caption: { fontSize: rf(11), color: c.foregroundSubtle, marginTop: r(3) },
  });
