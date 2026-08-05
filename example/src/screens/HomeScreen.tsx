import { StyleSheet, Text, View } from 'react-native';
import {
  EntryCard,
  Tag,
  fw,
  space,
  type,
  type ColorTokens,
  useThemedStyles,
} from '@unif/react-native-design';
import type { ExampleRoute } from '../navigation/exampleNavigation';
import { ShowcaseScaffold } from '../shared/ShowcaseScaffold';

type HomeScreenProps = {
  onNavigate: (route: ExampleRoute) => void;
};

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const styles = useThemedStyles(makeStyles);

  return (
    <ShowcaseScaffold
      title="HMS Scan 能力展厅"
      subtitle="按职责边界选择接入层级"
    >
      <View style={styles.intro}>
        <Text style={styles.title}>同一个 SDK 的三种使用层级</Text>
        <Text style={styles.description}>
          从开箱即用的成品页，到完全由宿主管理的扫码视图与图片解码。
        </Text>
      </View>

      <View style={styles.tags}>
        <Tag label="新架构" variant="brand" />
        <Tag label="Android ≥ 24" variant="info" />
        <Tag label="iOS 真机" variant="outline" />
      </View>

      <View style={styles.entries}>
        <EntryCard
          icon="scanner"
          title="Scanner 成品页"
          sub="内置权限、状态机、取景框与确认卡"
          onPress={() => onNavigate({ name: 'scanner' })}
        />
        <EntryCard
          icon="scan"
          title="HmsScanView 自定义页"
          sub="宿主自管 UI、权限、控制与结果状态"
          onPress={() => onNavigate({ name: 'headless' })}
        />
        <EntryCard
          icon="image"
          title="decodeImage 图片识别"
          sub="选择本地图片并在设备上离线解码"
          onPress={() => onNavigate({ name: 'decode-image' })}
        />
      </View>
    </ShowcaseScaffold>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    intro: {
      rowGap: space['3'],
    },
    title: {
      color: colors.foreground,
      fontSize: type.h1,
      fontWeight: fw.bold,
    },
    description: {
      color: colors.foregroundMuted,
      fontSize: type.sm,
      lineHeight: type.sm * 1.5,
    },
    tags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space['3'],
    },
    entries: {
      rowGap: space['5'],
    },
  });
