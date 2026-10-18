import {
  FlashOffOutlined,
  FlashOnOutlined,
  ImageOutlined,
  UndoOutlined,
} from '@unif/react-native-icons';
import type { ComponentType } from 'react';
import type { IconProps } from '@unif/react-native-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  GlassLayer,
  darkColors,
  useColors,
  r,
  mediaPalette,
  type as typography,
  useThemedStyles,
  fw,
} from '@unif/react-native-design';
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
    <View
      style={[styles.bar, { bottom: bottomInset + r(50) }]}
      pointerEvents="box-none"
    >
      {onClose && (
        <ToolbarItem icon={UndoOutlined} label="返回" onPress={onClose} />
      )}
      {onFlash && (
        <ToolbarItem
          icon={flash ? FlashOnOutlined : FlashOffOutlined}
          label={flash ? '已开灯' : '手电筒'}
          activeColor={flash ? c.primary : undefined}
          onPress={onFlash}
        />
      )}
      {onAlbum && (
        <ToolbarItem icon={ImageOutlined} label="相册" onPress={onAlbum} />
      )}
    </View>
  );
}

function ToolbarItem({
  icon: Icon,
  label,
  activeColor,
  onPress,
}: {
  icon: ComponentType<IconProps>;
  label: string;
  activeColor?: string;
  onPress: () => void;
}) {
  const s = useThemedStyles(makeTextStyles);
  const c = useColors();
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
              activeColor ? { backgroundColor: activeColor } : undefined,
            ]}
          >
            {!activeColor && (
              <GlassLayer
                colorScheme="dark"
                style={styles.glass}
                testID="scan-toolbar-glass"
              />
            )}
            <Icon
              size={r(23)}
              color={activeColor ? c.onPrimary : scanChrome.white}
              style={pressed && { opacity: 0.7 }}
            />
          </View>
          <Text style={s.label}>{label}</Text>
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
  glass: { borderRadius: 999 },
  circle: {
    width: r(54),
    height: r(54),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: darkColors.glassBorder,
    overflow: 'hidden',
  },
});

const makeTextStyles = () =>
  StyleSheet.create({
    label: {
      fontSize: typography.xxs,
      fontWeight: fw.medium,
      color: scanChrome.toolbarLabel,
      textShadowColor: mediaPalette.overlay,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
  });
