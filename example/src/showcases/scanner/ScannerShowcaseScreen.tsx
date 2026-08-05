import {
  useCallback,
  useEffect,
  useReducer,
  type ComponentType,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';
import {
  Button,
  Card,
  Switch,
  fontMono,
  fw,
  space,
  toast,
  type,
  type ColorTokens,
  useColors,
  useThemedStyles,
} from '@unif/react-native-design';
import {
  Scanner,
  type ScannerProps,
  type ScanError,
  type ScanProduct,
  type ScanResult,
} from '@unif/react-native-hms-scan';
import { FormatSelector } from '../../shared/FormatSelector';
import { ShowcaseScaffold } from '../../shared/ShowcaseScaffold';
import { formatsForPreset } from '../../shared/formatPresets';
import { pickLocalImage } from '../../shared/pickLocalImage';
import { DEMO_BARCODE, DEMO_PRODUCT, lookupDemoProduct } from './products';
import {
  initialScannerDemoState,
  scannerDemoReducer,
  type ScannerDemoState,
} from './scannerModel';

export type ScannerCallbacks = Required<
  Pick<
    ScannerProps,
    | 'onClose'
    | 'onScanError'
    | 'resolveProduct'
    | 'onConfirm'
    | 'pickImage'
  >
>;

export type ActiveBackHandler = () => boolean;

type ScannerShowcaseScreenProps = {
  onBack: () => void;
  onActiveBackHandlerChange?: (handler: ActiveBackHandler | null) => void;
  ScannerComponent?: ComponentType<ScannerProps>;
};

export function buildScannerProps(
  state: ScannerDemoState,
  insets: EdgeInsets,
  callbacks: ScannerCallbacks
): ScannerProps {
  const formats = formatsForPreset(state.preset);

  return {
    title: '扫一扫',
    ...(formats ? { formats } : {}),
    topInset: insets.top,
    bottomInset: insets.bottom,
    autoConfirm: state.autoConfirm,
    ...callbacks,
  };
}

export function ScannerShowcaseScreen({
  onBack,
  onActiveBackHandlerChange,
  ScannerComponent = Scanner,
}: ScannerShowcaseScreenProps) {
  const [state, dispatch] = useReducer(
    scannerDemoReducer,
    initialScannerDemoState
  );
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  const onClose = useCallback(() => {
    dispatch({ type: 'close' });
  }, []);

  const handleActiveBack = useCallback(() => {
    onClose();
    return true;
  }, [onClose]);

  useEffect(() => {
    if (!state.active) return;

    onActiveBackHandlerChange?.(handleActiveBack);
    return () => onActiveBackHandlerChange?.(null);
  }, [handleActiveBack, onActiveBackHandlerChange, state.active]);

  const onConfirm = useCallback(
    (product: ScanProduct, result: ScanResult) => {
      dispatch({ type: 'confirmed', product, result });
      toast.success('已保存扫码结果');
    },
    []
  );

  const onScanError = useCallback((error: ScanError) => {
    dispatch({ type: 'error', error });
    toast.error(`${error.code}：${error.message}`);
  }, []);

  if (state.active) {
    return (
      <ScannerComponent
        {...buildScannerProps(state, insets, {
          onClose,
          onConfirm,
          onScanError,
          pickImage: pickLocalImage,
          resolveProduct: lookupDemoProduct,
        })}
      />
    );
  }

  return (
    <ShowcaseScaffold
      title="Scanner 配置"
      subtitle="成品页负责完整扫描流程"
      onBack={onBack}
    >
      <Card>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>进入前配置</Text>
          <FormatSelector
            value={state.preset}
            onChange={(preset) => dispatch({ type: 'setPreset', preset })}
          />
          <View style={styles.demoCopy}>
            <Text style={styles.rowTitle}>可复现商品演示</Text>
            <Text selectable style={styles.code}>
              EAN-13：{DEMO_BARCODE}
            </Text>
            <Text style={styles.rowDescription}>
              预期商品：{DEMO_PRODUCT.name}（{DEMO_PRODUCT.brand}，
              {DEMO_PRODUCT.price}）
            </Text>
            <Text style={styles.rowDescription}>
              其他条码由演示 resolver 返回 null，并进入未识别状态。
            </Text>
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <Text style={styles.rowTitle}>自动确认</Text>
              <Text style={styles.rowDescription}>
                命中商品后跳过确认卡并立即返回配置页
              </Text>
            </View>
            <Switch
              value={state.autoConfirm}
              onChange={(autoConfirm) =>
                dispatch({ type: 'setAutoConfirm', autoConfirm })
              }
              accessibilityLabel="自动确认"
            />
          </View>
          <Button
            label="进入全屏 Scanner"
            leftIcon="scanner"
            block
            onPress={() => dispatch({ type: 'enter' })}
          />
        </View>
      </Card>

      {state.lastConfirmed ? (
        <Card>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>最近确认</Text>
            <Text testID="last-confirmed-json" style={styles.code}>
              {JSON.stringify(state.lastConfirmed, null, 2)}
            </Text>
          </View>
        </Card>
      ) : null}

      {state.lastError ? (
        <Card borderColor={colors.error}>
          <View style={styles.cardContent}>
            <Text style={styles.errorTitle}>{state.lastError.code}</Text>
            <Text style={styles.rowDescription}>
              {state.lastError.message}
            </Text>
          </View>
        </Card>
      ) : null}
    </ShowcaseScaffold>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    cardContent: {
      rowGap: space['5'],
    },
    cardTitle: {
      color: colors.foreground,
      fontSize: type.h3,
      fontWeight: fw.semi,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: space['5'],
    },
    switchCopy: {
      flex: 1,
      rowGap: space['2'],
    },
    demoCopy: {
      rowGap: space['2'],
    },
    rowTitle: {
      color: colors.foreground,
      fontSize: type.sm,
      fontWeight: fw.medium,
    },
    rowDescription: {
      color: colors.foregroundMuted,
      fontSize: type.xs,
      lineHeight: type.xs * 1.5,
    },
    code: {
      color: colors.foregroundMuted,
      fontFamily: fontMono,
      fontSize: type.micro,
      lineHeight: type.micro * 1.5,
    },
    errorTitle: {
      color: colors.error,
      fontSize: type.sm,
      fontWeight: fw.semi,
    },
  });
