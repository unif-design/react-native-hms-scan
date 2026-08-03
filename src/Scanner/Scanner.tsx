import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';
import { ThemeProvider } from '@unif/react-native-design';
import { HmsScanView } from '../HmsScanView';
import { decodeImage } from '../decodeImage';
import {
  getCameraPermissionStatus,
  requestCameraPermission,
} from '../permissions';
import type { BarcodeFormat, ScanError, ScanProduct, ScanResult } from '../types';
import { scanChrome } from './scanChrome';
import { Viewfinder } from './Viewfinder';
import { ScanTopBar } from './ScanTopBar';
import { ScanToolbar } from './ScanToolbar';
import { ResultFocus } from './ResultFocus';
import { ResultFail } from './ResultFail';
import { DeniedOverlay } from './DeniedOverlay';
import { ScanErrorOverlay } from './ScanErrorOverlay';

// 'done':autoConfirm 自动回调后的终态——相机暂停、不出卡片、不自动重扫(宿主通常已导航离开)。
type Phase =
  | 'init'
  | 'scan'
  | 'detecting'
  | 'success'
  | 'fail'
  | 'denied'
  | 'error'
  | 'done';

const VF_SIZE = 256;
const DEFAULT_HINT = '将条码 / 二维码放入框内，自动扫描';

function toScanError(error: unknown, fallbackMessage: string): ScanError {
  if (error && typeof error === 'object') {
    const native = error as { code?: unknown; message?: unknown };
    return {
      code: typeof native.code === 'string' ? native.code : 'E_UNKNOWN',
      message: typeof native.message === 'string' ? native.message : fallbackMessage,
    };
  }
  return { code: 'E_UNKNOWN', message: fallbackMessage };
}

export interface ScannerProps {
  /** 顶栏标题，默认 "扫一扫"。 */
  title?: string;
  /** 限定识别码制；不传 = 全部。 */
  formats?: readonly BarcodeFormat[];
  /** 取景态提示文案。 */
  hintText?: string;
  /** 顶部安全区（默认 54）。用 react-native-safe-area-context 时可传 insets.top。 */
  topInset?: number;
  /** 底部安全区（默认 34）。 */
  bottomInset?: number;
  /** 是否显示手电筒按钮，默认 true。手电由库内自管（Android 可用；iOS 为 best-effort，可在 iOS 上关掉）。 */
  showTorch?: boolean;
  /** 返回回调（退出扫码页，回到上一级）；按钮在底部工具栏，与手电筒并排。 */
  onClose?: () => void;
  /** 扫码相机或权限检查出错时上报。 */
  onScanError?: (error: ScanError) => void;
  /**
   * 扫到条码后由宿主解析商品信息（用于浮层确认卡）。
   * 返回 null/undefined 视为"未识别"，抛错亦然。不传则默认用扫到的原文当商品名。
   */
  resolveProduct?: (
    result: ScanResult
  ) => ScanProduct | null | undefined | Promise<ScanProduct | null | undefined>;
  /** 用户点"确认"：把结果带回上一级（宿主通常在此导航返回）。 */
  onConfirm?: (product: ScanProduct, result: ScanResult) => void;
  /**
   * 自动确认：传 `onConfirm` 时，扫到并解析成功后**不显示结果卡**，直接触发
   * `onConfirm(product, result)`；未传回调时仍显示结果卡。默认 `false`（显示结果卡，
   * 由用户点"确定"）。
   * 适合"扫到即用、不需要二次确认"的场景。回调后相机暂停、不自动重扫——宿主通常在
   * `onConfirm` 里导航离开；若需再扫由宿主控制（如重新挂载 `<Scanner>`）。
   * 注：未识别（`resolveProduct` 返回 `null`/抛错）仍走失败态可重扫，不会误触发。
   */
  autoConfirm?: boolean;
  /**
   * 点"相册"：宿主用自己的图片选择器选图并返回本地 uri（取消则返回 null）。
   * 库不内置图片选择器（遵循 RN 惯例）：**传了才显示相册按钮**，不传则隐藏。
   */
  pickImage?: () => Promise<string | null>;
}

/**
 * 成品「扫一扫」界面（聚焦款）。底层 <HmsScanView> 出相机画面，取景框 / 工具栏 / 结果卡
 * 全用 @unif/react-native-design 的主题令牌与组件绘制（统一风格）。自带 ThemeProvider，
 * 可直接整屏接入；放进宿主已有的 ThemeProvider 里也兼容。
 */
export function Scanner(props: ScannerProps) {
  return (
    <ThemeProvider>
      <ScannerInner {...props} />
    </ThemeProvider>
  );
}

function ScannerInner({
  title = '扫一扫',
  formats,
  hintText = DEFAULT_HINT,
  topInset = 54,
  bottomInset = 34,
  showTorch = true,
  onClose,
  resolveProduct,
  onConfirm,
  autoConfirm = false,
  pickImage,
  onScanError,
}: ScannerProps) {
  const [phase, setPhase] = useState<Phase>('init');
  const [torch, setTorch] = useState(false);
  const [product, setProduct] = useState<ScanProduct | null>(null);
  const [detectMs, setDetectMs] = useState(0);

  const handlingRef = useRef(false);
  const detectStartRef = useRef(0);
  const lastResultRef = useRef<ScanResult | null>(null);
  const mountedRef = useRef(true);
  const permissionRunRef = useRef(0);
  const waitingForSettingsRef = useRef(false);
  const onScanErrorRef = useRef(onScanError);
  onScanErrorRef.current = onScanError;

  const reportFatalError = useCallback((error: ScanError) => {
    // fatal 后不允许已在途的权限检查覆盖 error phase。
    ++permissionRunRef.current;
    setPhase('error');
    onScanErrorRef.current?.(error);
  }, []);

  const runPermissionFlow = useCallback(
    async (requestIfNeeded: boolean) => {
      const runId = ++permissionRunRef.current;
      const isCurrent = () => mountedRef.current && permissionRunRef.current === runId;
      try {
        let status = await getCameraPermissionStatus();
        if (!isCurrent()) return;
        if (requestIfNeeded && (status === 'undetermined' || status === 'denied')) {
          status = await requestCameraPermission();
          if (!isCurrent()) return;
        }
        setPhase(status === 'granted' ? 'scan' : 'denied');
      } catch (error) {
        if (!isCurrent()) return;
        reportFatalError(toScanError(error, '检查相机权限失败'));
      }
    },
    [reportFatalError]
  );

  // 权限流：已授权 → scan；否则请求；仍未授权 → denied。
  useEffect(() => {
    mountedRef.current = true;
    void runPermissionFlow(true);
    return () => {
      mountedRef.current = false;
      ++permissionRunRef.current;
    };
  }, [runPermissionFlow]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && waitingForSettingsRef.current) {
        waitingForSettingsRef.current = false;
        void runPermissionFlow(false);
      }
    });
    return () => subscription.remove();
  }, [runPermissionFlow]);

  const reset = useCallback(() => {
    handlingRef.current = false;
    setProduct(null);
    setPhase('scan');
  }, []);

  const finalize = useCallback(
    async (result: ScanResult) => {
      lastResultRef.current = result;
      try {
        const resolved = resolveProduct
          ? await resolveProduct(result)
          : { name: result.value };
        if (!mountedRef.current) return;
        if (!resolved) {
          setPhase('fail');
          return;
        }
        const p: ScanProduct = { ...resolved, barcode: resolved.barcode ?? result.value };
        if (autoConfirm && onConfirm) {
          // 跳过结果卡:直接回调,进 'done' 终态(相机暂停、不自动重扫)。
          onConfirm(p, result);
          setPhase('done');
          return;
        }
        setProduct(p);
        setDetectMs(Date.now() - detectStartRef.current);
        setPhase('success');
      } catch {
        if (mountedRef.current) setPhase('fail');
      }
    },
    [resolveProduct, autoConfirm, onConfirm]
  );

  const onCameraResult = useCallback(
    (results: ScanResult[]) => {
      if (phase !== 'scan' || handlingRef.current) return;
      const first = results[0];
      if (!first) return;
      handlingRef.current = true;
      detectStartRef.current = Date.now();
      setPhase('detecting');
      void finalize(first);
    },
    [phase, finalize]
  );

  const handleViewScanError = useCallback((error: ScanError) => {
    if (error.code === 'E_NO_CAMERA_PERMISSION') {
      setPhase('denied');
    } else if (error.code !== 'E_NO_RESULT') {
      reportFatalError(error);
      return;
    }
    onScanErrorRef.current?.(error);
  }, [reportFatalError]);

  const openSettings = useCallback(async () => {
    waitingForSettingsRef.current = true;
    try {
      await Linking.openSettings();
    } catch (error) {
      waitingForSettingsRef.current = false;
      if (mountedRef.current) {
        reportFatalError(toScanError(error, '打开系统设置失败'));
      }
    }
  }, [reportFatalError]);

  const retryCamera = useCallback(() => {
    handlingRef.current = false;
    setProduct(null);
    setPhase('init');
    void runPermissionFlow(true);
  }, [runPermissionFlow]);

  const onAlbum = useCallback(async () => {
    if (!pickImage || handlingRef.current) return;
    handlingRef.current = true;
    setPhase('detecting');
    try {
      const uri = await pickImage();
      if (!mountedRef.current) return;
      if (!uri) {
        reset();
        return;
      }
      detectStartRef.current = Date.now();
      const results = await decodeImage(uri, formats ? { formats } : undefined);
      if (!mountedRef.current) return;
      const first = results[0];
      if (!first) {
        setPhase('fail');
        return;
      }
      await finalize(first);
    } catch {
      if (mountedRef.current) setPhase('fail');
    }
  }, [pickImage, formats, finalize, reset]);

  const onConfirmPress = useCallback(() => {
    const r = lastResultRef.current;
    const p = product;
    if (p && r) onConfirm?.(p, r);
    // 不在此 toast:确认页已展示结果,且 toast 是宿主职责(onConfirm 回调里宿主自己提示)——
    // 避免重复 toast,也避免宿主导航离开后依赖 Scanner 自带 ToastHost 存活的隐患。
    reset();
  }, [product, onConfirm, reset]);

  const showChrome = phase === 'scan' || phase === 'detecting';

  return (
    <View style={styles.root}>
      {phase !== 'denied' && phase !== 'init' && phase !== 'error' && (
        <HmsScanView
          style={StyleSheet.absoluteFill}
          formats={formats}
          paused={phase !== 'scan'}
          torch={torch}
          onScanResult={onCameraResult}
          onScanError={handleViewScanError}
        />
      )}

      {showChrome && (
        <Viewfinder size={VF_SIZE} detecting={phase === 'detecting'} hintText={hintText} />
      )}

      {phase !== 'denied' && phase !== 'init' && phase !== 'error' && (
        <ScanTopBar title={title} topInset={topInset} />
      )}

      {showChrome && (showTorch || !!pickImage || !!onClose) && (
        <ScanToolbar
          flash={torch}
          bottomInset={bottomInset}
          onFlash={showTorch ? () => setTorch((t) => !t) : undefined}
          onAlbum={pickImage ? onAlbum : undefined}
          onClose={onClose}
        />
      )}

      {phase === 'success' && product && (
        <ResultFocus
          product={product}
          detectMs={detectMs}
          bottomInset={bottomInset}
          onRescan={reset}
          onConfirm={onConfirmPress}
        />
      )}

      {phase === 'fail' && <ResultFail bottomInset={bottomInset} onRescan={reset} />}

      {phase === 'error' && <ScanErrorOverlay onClose={onClose} onRetry={retryCamera} />}

      {phase === 'denied' && (
        <DeniedOverlay onClose={onClose} onSettings={openSettings} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: scanChrome.cameraBg },
});
