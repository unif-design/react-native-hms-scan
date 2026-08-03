import {
  useCallback,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ComponentType,
} from 'react';
import {
  AppState,
  Linking,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Button,
  Card,
  Empty,
  Spinner,
  StatusDot,
  Switch,
  Tag,
  fw,
  space,
  type,
  type ColorTokens,
  useColors,
  useThemedStyles,
} from '@unif/react-native-design';
import {
  HmsScanView,
  getCameraPermissionStatus,
  requestCameraPermission,
  type HmsScanViewProps,
} from '@unif/react-native-hms-scan';
import { ShowcaseScaffold } from '../../shared/ShowcaseScaffold';
import {
  createHeadlessController,
  type HeadlessController,
} from './headlessController';
import type { HeadlessPlatform } from './headlessState';

type HeadlessShowcaseScreenProps = {
  onBack: () => void;
  platform?: HeadlessPlatform;
  HmsScanViewComponent?: ComponentType<HmsScanViewProps>;
};

function useHeadlessController(): HeadlessController {
  return useMemo(
    () =>
      createHeadlessController({
        getStatus: getCameraPermissionStatus,
        request: requestCameraPermission,
        openSettings: () => Linking.openSettings(),
      }),
    []
  );
}

function resolvePlatform(): HeadlessPlatform {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

export function HeadlessShowcaseScreen({
  onBack,
  platform = resolvePlatform(),
  HmsScanViewComponent = HmsScanView,
}: HeadlessShowcaseScreenProps) {
  const controller = useHeadlessController();
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot
  );
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  useEffect(() => {
    void controller.check(platform);
  }, [controller, platform]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void controller.onAppActive(platform);
      }
    });

    return () => subscription.remove();
  }, [controller, platform]);

  const retryPermission = useCallback(() => {
    void controller.check(platform);
  }, [controller, platform]);

  const requestPermission = useCallback(() => {
    void controller.request();
  }, [controller]);

  const openSettings = useCallback(() => {
    void controller.openSettings();
  }, [controller]);

  const permissionPending =
    snapshot.permission === 'checking' ||
    snapshot.permission === 'requesting';

  return (
    <ShowcaseScaffold
      title="HmsScanView 自定义页"
      subtitle="宿主管理权限、叠层、控制与结果"
      onBack={onBack}
    >
      <Text style={styles.sectionTitle}>权限与预览控制</Text>

      {!snapshot.shouldMountView ? (
        <Card>
          <View style={styles.cardContent}>
            {permissionPending ? (
              <View style={styles.pending}>
                <Spinner />
                <Text style={styles.body}>
                  {snapshot.permission === 'requesting'
                    ? '正在申请相机权限…'
                    : '正在检查相机权限…'}
                </Text>
              </View>
            ) : null}

            {snapshot.permission === 'denied' ? (
              <>
                <Empty
                  icon="permission-denied"
                  title="需要相机权限"
                  desc="只有点击下方按钮后才会发起系统权限请求。"
                />
                <Button
                  label="申请相机权限"
                  block
                  onPress={requestPermission}
                />
              </>
            ) : null}

            {snapshot.permission === 'blocked' ? (
              <>
                <Empty
                  icon="permission-denied"
                  title="相机权限已被阻止"
                  desc="请在系统设置中允许相机权限，返回 App 后会重新检查。"
                />
                <Button
                  label="打开系统设置"
                  block
                  onPress={openSettings}
                />
              </>
            ) : null}

            {snapshot.permission === 'error' ||
            snapshot.needsPermissionRecheck ? (
              <>
                <Empty
                  icon="error-alert"
                  title="相机权限检查失败"
                  desc="预览保持关闭，重新检查通过后才会挂载相机。"
                />
                {snapshot.error ? (
                  <View style={styles.errorCopy}>
                    <Tag label={snapshot.error.code} variant="error" />
                    <Text style={styles.body}>{snapshot.error.message}</Text>
                  </View>
                ) : null}
                <Button
                  label="重新检查权限"
                  variant="secondary"
                  block
                  onPress={retryPermission}
                />
              </>
            ) : null}
          </View>
        </Card>
      ) : (
        <>
          <Card bare>
            <View testID="headless-preview" style={styles.preview}>
              <HmsScanViewComponent
                style={StyleSheet.absoluteFill}
                paused={snapshot.paused}
                continuous={snapshot.continuous}
                torch={snapshot.torchRequested}
                onScanResult={(results) =>
                  controller.dispatch({ type: 'scanResults', results })
                }
                onScanError={(error) =>
                  controller.dispatch({ type: 'scanError', error })
                }
                onTorchStatus={(status) =>
                  controller.dispatch({ type: 'torchStatus', status })
                }
              />
              <View pointerEvents="none" style={styles.previewOverlay}>
                <View style={styles.previewStatus}>
                  <StatusDot
                    status={snapshot.paused ? 'pending' : 'active'}
                    accessibilityLabel=""
                  />
                  <Text style={styles.previewStatusText}>
                    {snapshot.paused ? '扫描已暂停' : '正在扫描'}
                  </Text>
                </View>
                <View style={styles.scanFrame} />
              </View>
            </View>
          </Card>

          <Card>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>预览控制</Text>
              <ControlRow label="暂停扫描">
                <Switch
                  value={snapshot.paused}
                  accessibilityLabel="暂停扫描"
                  onChange={(paused) =>
                    controller.dispatch({ type: 'setPaused', paused })
                  }
                />
              </ControlRow>
              <ControlRow label="连续扫描">
                <Switch
                  value={snapshot.continuous}
                  accessibilityLabel="连续扫描"
                  onChange={(continuous) =>
                    controller.dispatch({ type: 'setContinuous', continuous })
                  }
                />
              </ControlRow>
              <ControlRow label="请求手电">
                <Switch
                  value={snapshot.torchRequested}
                  accessibilityLabel="请求手电"
                  onChange={(torchRequested) =>
                    controller.dispatch({
                      type: 'setTorchRequested',
                      torchRequested,
                    })
                  }
                />
              </ControlRow>
              <View style={styles.torchStatus}>
                <Tag
                  label={`手电请求：${
                    snapshot.torchRequested ? '开启' : '关闭'
                  }`}
                  variant={snapshot.torchRequested ? 'brand' : 'neutral'}
                />
                <Tag
                  label={`手电实际：${
                    snapshot.torchStatus.on ? '开启' : '关闭'
                  }`}
                  variant={snapshot.torchStatus.on ? 'success' : 'outline'}
                />
                <Tag
                  label={`available：${
                    snapshot.torchStatus.available ? '是' : '否'
                  }`}
                  variant="info"
                />
              </View>
            </View>
          </Card>

          {snapshot.error ? (
            <Card borderColor={colors.error}>
              <View style={styles.cardContent}>
                <View style={styles.errorCopy}>
                  <Tag
                    label={snapshot.error.code}
                    variant={
                      snapshot.error.code === 'E_NO_RESULT' ? 'info' : 'error'
                    }
                  />
                  <Text style={styles.body}>{snapshot.error.message}</Text>
                </View>
                {snapshot.error.code !== 'E_NO_RESULT' ? (
                  <Button
                    label="重试扫描"
                    variant="secondary"
                    block
                    onPress={() => controller.dispatch({ type: 'retry' })}
                  />
                ) : null}
              </View>
            </Card>
          ) : null}

          {snapshot.paused && snapshot.results.length > 0 ? (
            <Button
              label="继续扫描"
              leftIcon="scan"
              block
              onPress={() => controller.dispatch({ type: 'retry' })}
            />
          ) : null}

          {snapshot.results.length > 0 ? (
            <Card>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>最近结果</Text>
                {snapshot.results.map((result) => (
                  <View
                    key={`${result.format}:${result.value}`}
                    style={styles.result}
                  >
                    <Text style={styles.resultValue}>{result.value}</Text>
                    <Text style={styles.meta}>
                      {result.format} · {result.contentType}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}
        </>
      )}
    </ShowcaseScaffold>
  );
}

type ControlRowProps = {
  label: string;
  children: React.ReactNode;
};

function ControlRow({ label, children }: ControlRowProps) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.controlRow}>
      <Text style={styles.body}>{label}</Text>
      {children}
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    sectionTitle: {
      color: colors.foreground,
      fontSize: type.h2,
      fontWeight: fw.bold,
    },
    cardContent: {
      rowGap: space['4'],
    },
    cardTitle: {
      color: colors.foreground,
      fontSize: type.body,
      fontWeight: fw.semi,
    },
    body: {
      color: colors.foregroundMuted,
      fontSize: type.sm,
      lineHeight: type.sm * 1.5,
    },
    pending: {
      alignItems: 'center',
      rowGap: space['3'],
      paddingVertical: space['6'],
    },
    errorCopy: {
      alignItems: 'flex-start',
      rowGap: space['3'],
    },
    preview: {
      height: 360,
      overflow: 'hidden',
      backgroundColor: colors.inverseSurface,
    },
    previewOverlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
      padding: space['6'],
    },
    previewStatus: {
      position: 'absolute',
      top: space['4'],
      left: space['4'],
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: space['2'],
      paddingHorizontal: space['3'],
      paddingVertical: space['2'],
      backgroundColor: colors.surface,
    },
    previewStatusText: {
      color: colors.foreground,
      fontSize: type.xs,
      fontWeight: fw.semi,
    },
    scanFrame: {
      width: '72%',
      aspectRatio: 1,
      borderWidth: 3,
      borderColor: colors.primary,
    },
    controlRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      columnGap: space['4'],
    },
    torchStatus: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space['2'],
    },
    result: {
      rowGap: space['2'],
      paddingTop: space['3'],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.outline,
    },
    resultValue: {
      color: colors.foreground,
      fontSize: type.sm,
      fontWeight: fw.semi,
    },
    meta: {
      color: colors.foregroundMuted,
      fontSize: type.xs,
    },
  });
