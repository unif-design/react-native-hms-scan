import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HmsScanView } from '../HmsScanView/HmsScanView';
import { decodeImage } from '../decodeImage';
import {
  getCameraPermissionStatus,
  requestCameraPermission,
} from '../permissions';
import { formatConfiguration } from '../format';
import { scanError } from '../errors';
import type {
  RequestedScanFormat,
  ScannerImage,
  ScanFailure,
  ScanResult,
  ScanTorchState,
} from '../types';
import { Viewfinder } from './Viewfinder';
import { ScanTopBar } from './ScanTopBar';
import { ScanToolbar } from './ScanToolbar';
import { ResultFocus } from './ResultFocus/ResultFocus';
import { ResultFail } from './ResultFail';
import { DeniedOverlay } from './DeniedOverlay';
import { ScanErrorOverlay } from './ScanErrorOverlay';

import { styles } from './styles';
import type { Phase, ScannerProps, SelectedResult } from './types';

export function ScannerInner({
  title = '扫一扫',
  hintText = '将条码 / 二维码放入框内，自动扫描',
  formats,
  topInset,
  bottomInset,
  showTorch = true,
  autoConfirm = false,
  pickImage,
  onConfirm,
  onClose,
  onError,
}: ScannerProps) {
  const insets = useSafeAreaInsets();
  const config = formatConfiguration(formats);
  const configKey = config.error?.message ?? config.csv;
  const configRef = useRef(config);
  configRef.current = config;
  const callbacks = useRef({ onConfirm, onClose, onError, autoConfirm });
  callbacks.current = { onConfirm, onClose, onError, autoConfirm };
  const [phase, setPhase] = useState<Phase>('init');
  const [result, setResult] = useState<Readonly<ScanResult> | null>(null);
  const [torchRequest, setTorchRequest] = useState(false);
  const [torchState, setTorchState] = useState<Readonly<ScanTorchState>>({
    on: false,
  });
  const [scanSession, setScanSession] = useState(0);
  const [activeFormats, setActiveFormats] = useState<
    readonly RequestedScanFormat[]
  >([]);
  const mounted = useRef(false);
  const closed = useRef(false);
  const accepting = useRef(false);
  const cameraSession = useRef(0);
  const permissionRun = useRef(0);
  const imageRun = useRef(0);
  const imagePending = useRef(false);
  const restartAfterImage = useRef(false);
  const waitingForSettings = useRef(false);
  const selected = useRef<SelectedResult | null>(null);

  const stopAdoption = useCallback(() => {
    accepting.current = false;
    ++cameraSession.current;
    ++imageRun.current;
    ++permissionRun.current;
    selected.current = null;
  }, []);
  const startScan = useCallback(() => {
    if (!mounted.current || closed.current) return;
    if (imagePending.current) {
      restartAfterImage.current = true;
      setPhase('processing');
      return;
    }
    const current = configRef.current;
    if (current.error) {
      setPhase('error');
      callbacks.current.onError?.(current.error);
      return;
    }
    setActiveFormats(
      current.csv ? (current.csv.split(',') as RequestedScanFormat[]) : []
    );
    setResult(null);
    selected.current = null;
    accepting.current = true;
    setScanSession(++cameraSession.current);
    setPhase('scan');
  }, []);
  const reportFatal = useCallback(
    (error: Readonly<ScanFailure>) => {
      stopAdoption();
      setResult(null);
      setTorchRequest(false);
      setPhase(error.reason === 'permission_denied' ? 'denied' : 'error');
      callbacks.current.onError?.(error);
    },
    [stopAdoption]
  );
  const runPermission = useCallback(
    async (requestIfNeeded: boolean) => {
      const run = ++permissionRun.current;
      const current = () =>
        mounted.current && !closed.current && run === permissionRun.current;
      let status;
      try {
        status = await getCameraPermissionStatus();
        if (!current()) return;
        if (
          requestIfNeeded &&
          (status === 'denied' || status === 'undetermined')
        ) {
          status = await requestCameraPermission();
          if (!current()) return;
        }
      } catch (error) {
        if (current()) reportFatal(error as ScanFailure);
        return;
      }
      if (status === 'granted') startScan();
      else {
        accepting.current = false;
        setPhase('denied');
      }
    },
    [reportFatal, startScan]
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopAdoption();
    };
  }, [stopAdoption]);
  useEffect(() => {
    if (closed.current) return;
    stopAdoption();
    setResult(null);
    if (imagePending.current) {
      restartAfterImage.current = true;
      setPhase('processing');
      return;
    }
    if (configRef.current.error) {
      reportFatal(configRef.current.error);
      return;
    }
    setPhase('init');
    void runPermission(true);
  }, [configKey, reportFatal, runPermission, stopAdoption]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && waitingForSettings.current && !closed.current) {
        waitingForSettings.current = false;
        void runPermission(false);
      }
    });
    return () => subscription.remove();
  }, [runPermission]);
  useEffect(() => {
    if (!showTorch) setTorchRequest(false);
  }, [showTorch]);

  const deliver = useCallback(() => {
    const item = selected.current;
    if (!mounted.current || closed.current || !item || item.delivered) return;
    // Mark delivery before calling business code. A callback failure cannot undo it.
    item.delivered = true;
    setPhase('done');
    callbacks.current.onConfirm(item.result);
  }, []);
  const adopt = useCallback(
    (next: Readonly<ScanResult>) => {
      selected.current = { result: next, delivered: false };
      setResult(next);
      setPhase('result');
      if (callbacks.current.autoConfirm) deliver();
    },
    [deliver]
  );
  const onCameraResult = useCallback(
    (results: readonly ScanResult[]) => {
      if (
        !mounted.current ||
        closed.current ||
        !accepting.current ||
        scanSession !== cameraSession.current
      )
        return;
      const first = results[0];
      if (!first) return;
      accepting.current = false;
      adopt(first);
    },
    [adopt, scanSession]
  );
  const onCameraError = useCallback(
    (error: Readonly<ScanFailure>) => {
      if (
        !mounted.current ||
        closed.current ||
        !accepting.current ||
        scanSession !== cameraSession.current
      )
        return;
      reportFatal(error);
    },
    [reportFatal, scanSession]
  );
  const close = useCallback(() => {
    if (closed.current) return;
    closed.current = true;
    stopAdoption();
    setTorchRequest(false);
    setPhase('closed');
    callbacks.current.onClose?.();
  }, [stopAdoption]);
  const reset = useCallback(() => {
    stopAdoption();
    startScan();
  }, [startScan, stopAdoption]);
  const retry = useCallback(() => {
    stopAdoption();
    if (imagePending.current) {
      restartAfterImage.current = true;
      return;
    }
    setPhase('init');
    void runPermission(true);
  }, [runPermission, stopAdoption]);
  const openSettings = useCallback(async () => {
    waitingForSettings.current = true;
    try {
      await Linking.openSettings();
    } catch (error) {
      waitingForSettings.current = false;
      if (mounted.current && !closed.current)
        reportFatal(
          scanError(error, {
            reason: 'unavailable',
            message: '打开系统设置失败',
          })
        );
    }
  }, [reportFatal]);

  const onAlbum = useCallback(async () => {
    if (
      !pickImage ||
      !accepting.current ||
      imagePending.current ||
      closed.current
    )
      return;
    accepting.current = false;
    const run = ++imageRun.current;
    const current = () =>
      mounted.current && !closed.current && run === imageRun.current;
    const inputFormats = activeFormats;
    imagePending.current = true;
    setPhase('processing');
    let image: ScannerImage | null = null;
    let results: readonly ScanResult[] | undefined;
    let failure: ScanFailure | undefined;
    try {
      image = await pickImage();
      if (current() && image)
        results = await decodeImage({ uri: image.uri, formats: inputFormats });
    } catch (error) {
      failure = scanError(error, {
        reason: 'image_unavailable',
        message: '选择或读取图片失败',
      });
    } finally {
      imagePending.current = false;
      // The original provider owns cleanup, including after this component unmounts.
      try {
        image?.onSourceReleased?.();
      } finally {
        if (current()) {
          if (failure) {
            setPhase('imageError');
            callbacks.current.onError?.(failure);
          } else if (!image) startScan();
          else if (results?.[0]) adopt(results[0]);
          else setPhase('empty');
        } else if (
          restartAfterImage.current &&
          mounted.current &&
          !closed.current
        ) {
          restartAfterImage.current = false;
          setPhase('init');
          void runPermission(true);
        }
      }
    }
  }, [activeFormats, adopt, pickImage, runPermission, startScan]);

  const hasCamera = !['init', 'denied', 'error', 'closed'].includes(phase);
  const showChrome = phase === 'scan' || phase === 'processing';
  const bottom = bottomInset ?? insets.bottom;
  return (
    <View style={styles.root}>
      {hasCamera && (
        <HmsScanView
          key={scanSession}
          style={StyleSheet.absoluteFill}
          formats={activeFormats}
          paused={phase !== 'scan'}
          torch={torchRequest}
          onScanResult={onCameraResult}
          onScanError={onCameraError}
          onTorchState={(state) => {
            if (
              !closed.current &&
              mounted.current &&
              scanSession === cameraSession.current
            ) {
              setTorchState(state);
              // A failed request or the SDK's controls can change actual state.
              // Keep the next toggle based on that report, without optimistic UI.
              setTorchRequest(showTorch && state.on);
            }
          }}
        />
      )}
      {showChrome && (
        <Viewfinder
          size={256}
          detecting={phase === 'processing'}
          hintText={hintText}
        />
      )}
      {hasCamera && (
        <ScanTopBar title={title} topInset={topInset ?? insets.top} />
      )}
      {showChrome && (
        <ScanToolbar
          flash={torchState.on}
          bottomInset={bottom}
          onFlash={
            showTorch && torchState.available !== false
              ? () => setTorchRequest((value) => !value)
              : undefined
          }
          onAlbum={pickImage ? onAlbum : undefined}
          onClose={onClose ? close : undefined}
        />
      )}
      {phase === 'result' && result && (
        <ResultFocus
          result={result}
          bottomInset={bottom}
          onRescan={reset}
          onConfirm={deliver}
        />
      )}
      {(phase === 'empty' || phase === 'imageError') && (
        <ResultFail
          bottomInset={bottom}
          failed={phase === 'imageError'}
          onRescan={reset}
        />
      )}
      {phase === 'error' && (
        <ScanErrorOverlay
          onClose={onClose ? close : undefined}
          onRetry={retry}
        />
      )}
      {phase === 'denied' && (
        <DeniedOverlay
          onClose={onClose ? close : undefined}
          onSettings={openSettings}
        />
      )}
    </View>
  );
}
