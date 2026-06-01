import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { ThemeProvider, ToastHost, toast } from '@unif/react-native-design';
import { HmsScanView } from '../HmsScanView';
import { decodeImage } from '../decodeImage';
import {
  getCameraPermissionStatus,
  requestCameraPermission,
} from '../permissions';
import type { BarcodeFormat, ScanProduct, ScanResult } from '../types';
import { scanChrome } from './scanChrome';
import { Viewfinder } from './Viewfinder';
import { ScanTopBar } from './ScanTopBar';
import { ScanToolbar } from './ScanToolbar';
import { ResultFocus } from './ResultFocus';
import { ResultFail } from './ResultFail';
import { DeniedOverlay } from './DeniedOverlay';

type Phase = 'init' | 'scan' | 'detecting' | 'success' | 'fail' | 'denied';

const VF_SIZE = 256;
const DEFAULT_HINT = '将条码 / 二维码放入框内，自动扫描';

export interface ScannerProps {
  /** 顶栏标题，默认 "扫一扫"。 */
  title?: string;
  /** 限定识别码制；不传 = 全部。 */
  formats?: BarcodeFormat[];
  /** 取景态提示文案。 */
  hintText?: string;
  /** 顶部安全区（默认 54）。用 react-native-safe-area-context 时可传 insets.top。 */
  topInset?: number;
  /** 底部安全区（默认 34）。 */
  bottomInset?: number;
  /** 左上角关闭。 */
  onClose?: () => void;
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
   * 点"相册"：宿主用自己的图片选择器选图并返回本地 uri（取消则返回 null）。
   * 不传则相册按钮不可用。
   */
  pickImage?: () => Promise<string | null>;
}

/**
 * 成品「扫一扫」界面（聚焦款）。底层 <HmsScanView> 出相机画面，取景框 / 工具栏 / 结果卡
 * 全用 @unif/react-native-design 的主题令牌与组件绘制（统一风格）。自带 ThemeProvider +
 * ToastHost，可直接整屏接入；放进宿主已有的 ThemeProvider 里也兼容。
 */
export function Scanner(props: ScannerProps) {
  return (
    <ThemeProvider>
      <ScannerInner {...props} />
      <ToastHost />
    </ThemeProvider>
  );
}

function ScannerInner({
  title = '扫一扫',
  formats,
  hintText = DEFAULT_HINT,
  topInset = 54,
  bottomInset = 34,
  onClose,
  resolveProduct,
  onConfirm,
  pickImage,
}: ScannerProps) {
  const [phase, setPhase] = useState<Phase>('init');
  const [torch, setTorch] = useState(false);
  const [product, setProduct] = useState<ScanProduct | null>(null);
  const [detectMs, setDetectMs] = useState(0);

  const handlingRef = useRef(false);
  const detectStartRef = useRef(0);
  const lastResultRef = useRef<ScanResult | null>(null);
  const mountedRef = useRef(true);

  // 权限流：已授权 → scan；否则请求；仍未授权 → denied。
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        let status = await getCameraPermissionStatus();
        if (status === 'undetermined' || status === 'denied') {
          status = await requestCameraPermission();
        }
        if (!mountedRef.current) return;
        setPhase(status === 'granted' ? 'scan' : 'denied');
      } catch {
        if (mountedRef.current) setPhase('scan');
      }
    })();
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
        setProduct({ barcode: result.value, ...resolved });
        setDetectMs(Date.now() - detectStartRef.current);
        setPhase('success');
      } catch {
        if (mountedRef.current) setPhase('fail');
      }
    },
    [resolveProduct]
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

  const onScanError = useCallback((error: { code: string; message: string }) => {
    if (error.code === 'E_NO_CAMERA_PERMISSION') setPhase('denied');
  }, []);

  const onAlbum = useCallback(async () => {
    if (!pickImage || handlingRef.current) return;
    try {
      const uri = await pickImage();
      if (!uri || !mountedRef.current) return;
      handlingRef.current = true;
      detectStartRef.current = Date.now();
      setPhase('detecting');
      const results = await decodeImage(uri, formats ? { formats } : undefined);
      if (!mountedRef.current) return;
      const first = results[0];
      if (!first) {
        setPhase('fail');
        return;
      }
      await finalize(first);
    } catch {
      if (mountedRef.current) {
        handlingRef.current = true;
        setPhase('fail');
      }
    }
  }, [pickImage, formats, finalize]);

  const onConfirmPress = useCallback(() => {
    const r = lastResultRef.current;
    const p = product;
    if (p && r) onConfirm?.(p, r);
    toast.success('已确认 · 扫描结果已填入上一级');
    reset();
  }, [product, onConfirm, reset]);

  const showChrome = phase === 'scan' || phase === 'detecting';

  return (
    <View style={styles.root}>
      {phase !== 'denied' && phase !== 'init' && (
        <HmsScanView
          style={StyleSheet.absoluteFill}
          formats={formats}
          paused={phase !== 'scan'}
          torch={torch}
          onScanResult={onCameraResult}
          onScanError={onScanError}
        />
      )}

      {showChrome && (
        <Viewfinder size={VF_SIZE} detecting={phase === 'detecting'} hintText={hintText} />
      )}

      {phase !== 'denied' && phase !== 'init' && (
        <ScanTopBar title={title} topInset={topInset} onClose={onClose} />
      )}

      {showChrome && (
        <ScanToolbar
          flash={torch}
          bottomInset={bottomInset}
          onFlash={() => setTorch((t) => !t)}
          onAlbum={onAlbum}
        />
      )}

      {phase === 'success' && product && (
        <ResultFocus
          product={product}
          detectMs={detectMs}
          bottomInset={bottomInset}
          onContinue={reset}
          onConfirm={onConfirmPress}
        />
      )}

      {phase === 'fail' && <ResultFail bottomInset={bottomInset} onRetry={reset} />}

      {phase === 'denied' && (
        <DeniedOverlay onClose={onClose} onSettings={() => Linking.openSettings()} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: scanChrome.cameraBg },
});
