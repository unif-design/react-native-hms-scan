import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow } from './tokens';
import { Icon } from './Icon';
import { Monogram } from './Monogram';
import type { ScanProduct } from '../types';

interface ResultFocusProps {
  product: ScanProduct;
  /** 识别耗时（ms），用于 "已识别 · 0.6s"。<=0 则只显示 "已识别"。 */
  detectMs: number;
  bottomInset: number;
  onContinue: () => void;
  onConfirm: () => void;
}

// 聚焦款"浮层确认卡"：2px 橙边、悬浮在相机之上（无遮罩）。
export function ResultFocus({
  product,
  detectMs,
  bottomInset,
  onContinue,
  onConfirm,
}: ResultFocusProps) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [anim]);

  const brandChar =
    product.brandChar ?? (product.brand ?? product.name).charAt(0);
  const badge =
    detectMs > 0 ? `已识别 · ${(detectMs / 1000).toFixed(1)}s` : '已识别';
  const caption = product.priceCaption ?? '建议零售';

  return (
    <Animated.View
      style={[
        styles.wrap,
        { bottom: bottomInset + 18 },
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [24, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.card}>
        {/* 头部：成功勾 · 已识别 · 条码 */}
        <View style={styles.header}>
          <View style={styles.checkDot}>
            <Icon name="check" size={13} stroke={3} color={colors.onPrimary} />
          </View>
          <Text style={styles.badge}>{badge}</Text>
          <View style={{ flex: 1 }} />
          {!!(product.barcode ?? product.name) && (
            <Text style={styles.barcode}>{product.barcode}</Text>
          )}
        </View>

        {/* 商品行 */}
        <View style={styles.body}>
          <Monogram char={brandChar} size={58} />
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={2}>
              {product.brand ? `${product.brand} ` : ''}
              {product.name}
            </Text>
            {!!(product.spec || product.stockShort) && (
              <Text style={styles.sub} numberOfLines={1}>
                {[product.spec, product.stockShort ? `库存${product.stockShort}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            )}
          </View>
          {!!product.price && (
            <View style={styles.priceCol}>
              <Text style={styles.price}>{product.price}</Text>
              <Text style={styles.caption}>{caption}</Text>
            </View>
          )}
        </View>

        {/* 操作 */}
        <View style={styles.actions}>
          <Pressable
            onPress={onContinue}
            style={({ pressed }) => [styles.btn, styles.btnSecondary, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.btnSecondaryText}>继续扫描</Text>
          </Pressable>
          <Pressable
            onPress={onConfirm}
            style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.btnPrimaryText}>确认</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 50,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.primary,
    padding: 14,
    ...shadow.pop,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 7,
    marginBottom: 12,
  },
  checkDot: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { fontSize: 13, fontWeight: '600', color: colors.foreground },
  barcode: {
    fontSize: 12,
    color: colors.foregroundSubtle,
    fontVariant: ['tabular-nums'],
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 14,
    marginBottom: 14,
  },
  info: { flex: 1, minWidth: 0 },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
    lineHeight: 21,
  },
  sub: { fontSize: 12.5, color: colors.foregroundMuted, marginTop: 4 },
  priceCol: { alignItems: 'flex-end' },
  price: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    lineHeight: 24,
  },
  caption: { fontSize: 11, color: colors.foregroundSubtle, marginTop: 3 },
  actions: { flexDirection: 'row', columnGap: 10 },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondary: { backgroundColor: colors.surfaceContainer },
  btnSecondaryText: { fontSize: 15.5, fontWeight: '600', color: colors.foreground },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { fontSize: 15.5, fontWeight: '600', color: colors.onPrimary },
  pressed: { opacity: 0.7 },
});
