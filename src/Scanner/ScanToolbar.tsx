import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, useColors, r, rf, fw, type IconName } from '@unif/react-native-design';
import { scanChrome } from './scanChrome';

interface ScanToolbarProps {
  flash: boolean;
  bottomInset: number;
  /** 不传则不显示手电筒按钮。 */
  onFlash?: () => void;
  /** 不传则不显示相册按钮(库不内置图片选择器,需宿主提供 pickImage)。 */
  onAlbum?: () => void;
  /** 返回按钮（退出扫码页，与手电筒并排）；不传则不显示。 */
  onClose?: () => void;
}

// 底部工具栏：返回 · 手电筒 · 相册。点亮态用主题主色。
export function ScanToolbar({
  flash,
  bottomInset,
  onFlash,
  onAlbum,
  onClose,
}: ScanToolbarProps) {
  const c = useColors();
  return (
    <View style={[styles.bar, { bottom: bottomInset + r(50) }]} pointerEvents="box-none">
      {onClose && <ToolbarItem icon="arrow-left" label="返回" onPress={onClose} />}
      {onFlash && (
        <ToolbarItem
          icon={flash ? 'flash-on' : 'flash-off'}
          label={flash ? '已开灯' : '手电筒'}
          activeColor={flash ? c.primary : undefined}
          onPress={onFlash}
        />
      )}
      {onAlbum && <ToolbarItem icon="image" label="相册" onPress={onAlbum} />}
    </View>
  );
}

function ToolbarItem({
  icon,
  label,
  activeColor,
  onPress,
}: {
  icon: IconName;
  label: string;
  activeColor?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.item}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {({ pressed }) => (
        <>
          <View
            style={[
              styles.circle,
              activeColor
                ? { backgroundColor: activeColor, borderColor: scanChrome.glassBorderActive }
                : { backgroundColor: scanChrome.glassDisc2, borderColor: scanChrome.glassBorder },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Icon name={icon} size={r(23)} color={scanChrome.white} />
          </View>
          <Text style={styles.label}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    columnGap: r(40),
  },
  item: { width: r(72), alignItems: 'center', rowGap: r(7) },
  circle: {
    width: r(54),
    height: r(54),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: rf(12),
    fontWeight: fw.medium,
    color: scanChrome.toolbarLabel,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
