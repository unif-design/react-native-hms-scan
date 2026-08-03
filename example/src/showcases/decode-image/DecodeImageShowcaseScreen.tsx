import { useMemo, useState, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Button,
  Card,
  Empty,
  Spinner,
  Tag,
  fontMono,
  fw,
  space,
  type,
  type ColorTokens,
  useColors,
  useThemedStyles,
} from '@unif/react-native-design';
import { FormatSelector } from '../../shared/FormatSelector';
import { ShowcaseScaffold } from '../../shared/ShowcaseScaffold';
import {
  formatsForPreset,
  type FormatPresetId,
} from '../../shared/formatPresets';
import { pickLocalImage } from '../../shared/pickLocalImage';
import {
  createDecodeController,
  type DecodeController,
} from './decodeController';

type DecodeImageShowcaseScreenProps = {
  onBack: () => void;
};

function useDecodeController(): DecodeController {
  return useMemo(
    () => createDecodeController({ pickImage: pickLocalImage }),
    []
  );
}

export function DecodeImageShowcaseScreen({
  onBack,
}: DecodeImageShowcaseScreenProps) {
  const controller = useDecodeController();
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot
  );
  const [preset, setPreset] = useState<FormatPresetId>('all');
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const pending =
    snapshot.phase === 'picking' || snapshot.phase === 'decoding';

  return (
    <ShowcaseScaffold
      title="decodeImage 图片识别"
      subtitle="本地图片离线解码，不下载远程 URL"
      onBack={onBack}
    >
      <Card>
        <View style={styles.cardContent}>
          <FormatSelector
            value={preset}
            disabled={!snapshot.canStart}
            onChange={setPreset}
          />
          <Button
            label="选择图片并识别"
            leftIcon="image"
            block
            disabled={!snapshot.canStart}
            onPress={() =>
              void controller.pickAndDecode(formatsForPreset(preset))
            }
          />
        </View>
      </Card>

      {pending ? (
        <Card>
          <View style={styles.pending}>
            <Spinner color={colors.primary} />
            <Text style={styles.body}>
              {snapshot.phase === 'picking'
                ? '正在选择图片…'
                : '正在识别图片…'}
            </Text>
          </View>
        </Card>
      ) : null}

      {snapshot.phase === 'idle' ? (
        <Empty
          icon="image"
          title="选择一张本地图片"
          desc="支持系统图片选择器返回的本地 URI；取消选择不会产生错误。"
        />
      ) : null}

      {snapshot.phase === 'empty' ? (
        <Empty
          icon="scan"
          title="图片中未识别到条码"
          desc="图片已成功加载，这是正常的空结果，可换一张图片重试。"
        />
      ) : null}

      {snapshot.phase === 'success' ? (
        <View style={styles.results}>
          <Text style={styles.sectionTitle}>
            识别结果（{snapshot.results.length}）
          </Text>
          {snapshot.results.map((result, index) => (
            <Card key={`${result.format}:${result.value}:${index}`}>
              <View style={styles.result}>
                <Tag label={`结果 ${index + 1}`} variant="success" />
                <Text style={styles.value}>{result.value}</Text>
                <Text style={styles.meta}>码制：{result.format}</Text>
                <Text style={styles.meta}>
                  内容类型：{result.contentType}
                </Text>
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      {snapshot.phase === 'error' && snapshot.error ? (
        <Card borderColor={colors.error}>
          <View style={styles.cardContent}>
            {snapshot.error.kind === 'hms' ? (
              <>
                <Tag label={snapshot.error.code} variant="error" />
                <Text style={styles.sectionTitle}>图片识别失败</Text>
                <Text style={styles.body}>{snapshot.error.message}</Text>
              </>
            ) : (
              <>
                <Tag label="UNEXPECTED" variant="error" />
                <Text style={styles.sectionTitle}>图片识别失败</Text>
                <Text style={styles.body}>
                  选择或识别图片失败，请重试。
                </Text>
              </>
            )}
          </View>
        </Card>
      ) : null}

      {snapshot.selectedUri ? (
        <Card variant="plain">
          <View style={styles.cardContent}>
            <Tag label="本地 URI" variant="outline" />
            <Text style={styles.uri}>{snapshot.selectedUri}</Text>
          </View>
        </Card>
      ) : null}
    </ShowcaseScaffold>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    cardContent: {
      alignItems: 'flex-start',
      rowGap: space['4'],
    },
    pending: {
      alignItems: 'center',
      rowGap: space['3'],
      paddingVertical: space['5'],
    },
    body: {
      color: colors.foregroundMuted,
      fontSize: type.sm,
      lineHeight: type.sm * 1.5,
    },
    results: {
      rowGap: space['4'],
    },
    sectionTitle: {
      color: colors.foreground,
      fontSize: type.body,
      fontWeight: fw.semi,
    },
    result: {
      alignItems: 'flex-start',
      rowGap: space['3'],
    },
    value: {
      color: colors.foreground,
      fontFamily: fontMono,
      fontSize: type.sm,
      fontWeight: fw.semi,
    },
    meta: {
      color: colors.foregroundMuted,
      fontSize: type.xs,
    },
    uri: {
      color: colors.foregroundMuted,
      fontFamily: fontMono,
      fontSize: type.xs,
    },
  });
