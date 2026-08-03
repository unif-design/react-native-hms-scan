# `src` 审核问题修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 `src/` 审核确认的九项问题，使 `<Scanner>` 可直接渲染、权限和相机错误可恢复、相机与相册严格串行，并校准公共类型、商品 fallback、手电状态和 URI JSDoc。

**Architecture:** 保留 `<Scanner> → <HmsScanView> → Fabric/TurboModule` 分层，在 JS 成品页增加明确的 `error` phase、权限 request generation 和 AppState 设置返回恢复。所有识别入口继续共享 `handlingRef`，但相册路径在打开 picker 前即占锁；公共错误对象放入 `types.ts`，正式入口与 mock 共用。

**Tech Stack:** React Native 0.85 New Architecture、React 19、TypeScript 6、Jest 29、`@testing-library/react-native`、`@unif/react-native-design@0.8.1`、Docusaurus llms 生成脚本。

## Global Constraints

- 仅支持 React Native New Architecture（Fabric + TurboModule）。
- iOS 使用官方 `ScanKitFrameWork 1.1.2.305`，仅支持真机；不得恢复或伪造 Simulator slice。
- Android 继续使用 `com.huawei.hms:scanplus`，无需 agconnect/API Key，宿主仍需 Huawei Maven。
- `decodeImage` 的 `[]` 继续表示成功加载但图中无条码，不得改成异常。
- iOS `E_NO_RESULT` 是 soft view error，不得中断连续扫描；Android `E_CAMERA_INIT` 是 fatal view error。
- `autoConfirm` 只有在 `onConfirm` 正常同步返回后进入 `done`；同步 throw 继续进入 `fail`。
- 不修改 Android/iOS 原生实现、错误码、权限映射或 npm 版本。
- 只用 yarn；不使用 npm install、force、全局 override 或跳过检查。
- 保留用户已有改动；只提交当前 task 的测试、源码、文档和生成物。
- 代码注释只解释非显而易见的 why，优先中文。

---

### Task 1: 公共错误对象与 readonly formats

**Files:**
- Modify: `src/types.ts:82-103`
- Modify: `src/HmsScanView.tsx:5-29`
- Modify: `src/Scanner/Scanner.tsx:10-62`
- Modify: `src/index.tsx:10-19`
- Create: `src/__tests__/types.test.ts`
- Modify: `src/decodeImage.ts:5-12`
- Modify: `src/NativeHmsScan.ts:9-13`

**Interfaces:**
- Consumes: 现有 `BarcodeFormat`、`ALL_BARCODE_FORMATS`、`HmsScanViewProps`、`ScannerProps`。
- Produces: `ScanError { code: string; message: string }`；三个 `formats` 输入统一为 `readonly BarcodeFormat[]`；准确的平台 URI JSDoc。

- [ ] **Step 1: 写 readonly formats 的失败类型测试**

创建 `src/__tests__/types.test.ts`：

```ts
/// <reference types="jest" />

import { ALL_BARCODE_FORMATS } from '../types';
import type { DecodeImageOptions, ScanError } from '../types';
import type { HmsScanViewProps } from '../HmsScanView';
import type { ScannerProps } from '../Scanner/Scanner';

const subset = ['QR_CODE', 'EAN_13'] as const;
const decodeOptions = { formats: ALL_BARCODE_FORMATS } satisfies DecodeImageOptions;
const viewProps = { formats: subset } satisfies HmsScanViewProps;
const scannerProps = { formats: subset } satisfies ScannerProps;
const scanError = { code: 'E_CAMERA_INIT', message: 'camera failed' } satisfies ScanError;

test('公开 formats 输入接受 readonly 数组', () => {
  expect(decodeOptions.formats).toBe(ALL_BARCODE_FORMATS);
  expect(viewProps.formats).toBe(subset);
  expect(scannerProps.formats).toBe(subset);
  expect(scanError.code).toBe('E_CAMERA_INIT');
});
```

- [ ] **Step 2: 运行 typecheck，确认测试先红**

Run:

```sh
yarn typecheck
```

Expected: FAIL，至少包含 readonly tuple/array 不能赋给 `BarcodeFormat[]`，以及
`ScanError` 尚未导出的错误。

- [ ] **Step 3: 实现共享类型和 readonly 输入**

在 `src/types.ts` 中加入：

```ts
/** `<HmsScanView>` / `<Scanner>` 通过回调上报的普通错误对象。 */
export interface ScanError {
  code: string;
  message: string;
}
```

并把以下签名改成 readonly：

```ts
export interface DecodeImageOptions {
  formats?: readonly BarcodeFormat[];
}
```

`src/HmsScanView.tsx`：

```ts
import type { BarcodeFormat, ScanError, ScanResult } from './types';

export interface HmsScanViewProps extends ViewProps {
  formats?: readonly BarcodeFormat[];
  // ...
  onScanError?: (error: ScanError) => void;
}
```

`src/Scanner/Scanner.tsx`：

```ts
import type { BarcodeFormat, ScanError, ScanProduct, ScanResult } from '../types';

export interface ScannerProps {
  formats?: readonly BarcodeFormat[];
  // Task 4 会在同一 interface 增加 onScanError?: (error: ScanError) => void
}
```

`src/index.tsx` 的 type export 加入：

```ts
ScanError,
```

- [ ] **Step 4: 修正两处 URI JSDoc**

`src/decodeImage.ts` 与 `src/NativeHmsScan.ts` 使用一致表述：

```ts
/**
 * @param uri 本地图片。iOS 支持 file://、绝对路径、data:；Android 支持
 *            file://、绝对路径、content://、android.resource://。
 *            两端都不下载远程 URL，也不支持 ph:// / assets-library://。
 */
```

只修改注释；不要在 JS 层添加 `Platform` 分支或新的 URI reject。

- [ ] **Step 5: 运行类型与相关测试，确认转绿**

Run:

```sh
yarn typecheck
yarn test src/__tests__/types.test.ts
yarn test src/__tests__/format.test.ts
```

Expected: 三条命令 exit 0；readonly 常量、tuple 和普通数组均可用。

- [ ] **Step 6: 提交公共契约修复**

```sh
git add src/types.ts src/HmsScanView.tsx src/Scanner/Scanner.tsx src/index.tsx \
  src/decodeImage.ts src/NativeHmsScan.ts src/__tests__/types.test.ts
git commit -m "fix(types): accept readonly scan formats"
```

---

### Task 2: 移除内部 ToastHost 并修正结果终态

**Files:**
- Modify: `jest.setup.ts:1-133`
- Modify: `src/__tests__/Scanner.test.tsx`
- Modify: `src/Scanner/Scanner.tsx:1-154`

**Interfaces:**
- Consumes: Task 1 的 readonly `ScannerProps`。
- Produces: 不依赖 `SafeAreaProvider` 的 `<Scanner>` 外壳；安全的 `autoConfirm` fallback；稳定的默认 barcode。

- [ ] **Step 1: 让 design mock 暴露 ToastHost 标记**

删除 `jest.setup.ts` 顶部已经无效的 eslint disable，并把 design mock 中的
`ToastHost` 从空组件改成：

```ts
ToastHost: () => React.createElement(View, { testID: 'design-toast-host' }),
```

这不会加载真实 safe-area 依赖，但可检测 Scanner 是否错误地自带 host。

- [ ] **Step 2: 写三组失败回归**

在 `src/__tests__/Scanner.test.tsx` 加入：

```tsx
it('不挂载内部 ToastHost，宿主无需 SafeAreaProvider', async () => {
  render(<Scanner />);
  await screen.findByText('扫一扫');
  expect(screen.queryByTestId('design-toast-host')).toBeNull();
});

it('autoConfirm 未传 onConfirm 时降级显示确认卡', async () => {
  render(<Scanner autoConfirm resolveProduct={async () => ({ name: 'X 商品' })} />);
  await screen.findByText('扫一扫');
  await act(async () => {
    emitScan([{ value: '1', format: 'QR_CODE' }]);
  });
  expect(await screen.findByText('X 商品')).toBeTruthy();
  expect(screen.getByText('确定')).toBeTruthy();
});

it('resolveProduct 的 undefined barcode 回退到扫描值', async () => {
  const onConfirm = jest.fn();
  render(
    <Scanner
      onConfirm={onConfirm}
      resolveProduct={async () => ({ name: 'X 商品', barcode: undefined })}
    />
  );
  await screen.findByText('扫一扫');
  await act(async () => {
    emitScan([{ value: '690', format: 'EAN_13' }]);
  });
  fireEvent.press(await screen.findByText('确定'));
  expect(onConfirm.mock.calls[0][0].barcode).toBe('690');
});
```

- [ ] **Step 3: 运行 Scanner 单测，确认三组先红**

Run:

```sh
yarn test src/__tests__/Scanner.test.tsx
```

Expected: FAIL；可以查询到 `design-toast-host`，无回调 autoConfirm 找不到“确定”，
barcode 收到 `undefined`。

- [ ] **Step 4: 最小修复 Scanner 外壳和结果合并**

删除 `ToastHost` import 与节点：

```tsx
import { ThemeProvider } from '@unif/react-native-design';

export function Scanner(props: ScannerProps) {
  return (
    <ThemeProvider>
      <ScannerInner {...props} />
    </ThemeProvider>
  );
}
```

修正商品合并和自动确认条件：

```ts
const p: ScanProduct = {
  ...resolved,
  barcode: resolved.barcode ?? result.value,
};
if (autoConfirm && onConfirm) {
  onConfirm(p, result);
  setPhase('done');
  return;
}
```

不要改变同步 `onConfirm` throw 被外层 catch 收成 `fail` 的现有顺序。

- [ ] **Step 5: 运行 Scanner 测试和 lint**

Run:

```sh
yarn test src/__tests__/Scanner.test.tsx
yarn lint
```

Expected: Scanner tests 全部通过；lint 为 0 error，且原有
`Unused eslint-disable directive` warning 消失。

- [ ] **Step 6: 提交外壳与结果语义修复**

```sh
git add jest.setup.ts src/__tests__/Scanner.test.tsx src/Scanner/Scanner.tsx
git commit -m "fix(scanner): harden result handling"
```

---

### Task 3: 串行化相册与相机结果

**Files:**
- Modify: `src/__tests__/Scanner.test.tsx`
- Modify: `src/Scanner/Scanner.tsx:156-195`

**Interfaces:**
- Consumes: `pickImage(): Promise<string | null>`、`handlingRef`、`decodeImage`、`finalize`。
- Produces: picker pending 期间 `paused === true`；取消选择释放锁；相机结果不能与图片结果并发。

- [ ] **Step 1: 扩展 HmsScanView 测试桩**

把 `src/__tests__/Scanner.test.tsx` 的 mock 保存最新 props：

```tsx
type MockHmsScanViewProps = {
  paused?: boolean;
  torch?: boolean;
  onScanResult?: (results: unknown[]) => void;
  onScanError?: (error: { code: string; message: string }) => void;
  onTorchStatus?: (status: { available: boolean; on: boolean }) => void;
};

jest.mock('../HmsScanView', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    HmsScanView: (props: MockHmsScanViewProps) => {
      (globalThis as Record<string, unknown>).__hmsScanProps = props;
      return React.createElement(View, { testID: 'hms-scan-view' });
    },
  };
});

const nativeProps = () =>
  (globalThis as Record<string, unknown>).__hmsScanProps as MockHmsScanViewProps;
```

由于 Jest mock factory 的 hoist 限制，如果外部 type 引用触发 factory scope 错误，把
props type 写在 factory 内并让 `nativeProps()` 使用测试文件中的同结构 type；不要加载
真实 Fabric 组件。

- [ ] **Step 2: 写 picker pending 的失败测试**

```tsx
it('打开相册前即暂停相机，并忽略等待期间的相机结果', async () => {
  let resolvePick!: (uri: string | null) => void;
  const pickImage = jest.fn(
    () => new Promise<string | null>((resolve) => {
      resolvePick = resolve;
    })
  );
  const resolveProduct = jest.fn(async () => ({ name: 'X 商品' }));
  render(<Scanner pickImage={pickImage} resolveProduct={resolveProduct} />);
  await screen.findByText('扫一扫');

  fireEvent.press(screen.getByText('相册'));
  await waitFor(() => expect(nativeProps().paused).toBe(true));

  await act(async () => {
    nativeProps().onScanResult?.([{ value: 'camera', format: 'QR_CODE' }]);
  });
  expect(resolveProduct).not.toHaveBeenCalled();

  await act(async () => resolvePick(null));
  expect(await screen.findByText(HINT)).toBeTruthy();
  expect(nativeProps().paused).toBe(false);
});
```

再加一个双入口 autoConfirm 断言：picker pending 时触发相机回调，随后让 picker 返回
URI、mock `decodeImage` 返回图片结果，最终 `onConfirm` 只能被调用一次且结果来自图片。

- [ ] **Step 3: 运行目标测试，确认先红**

Run:

```sh
yarn test src/__tests__/Scanner.test.tsx -t "打开相册前|双入口"
```

Expected: FAIL；当前 picker pending 时 `paused` 仍为 false，且相机结果会进入
`resolveProduct`。

- [ ] **Step 4: 在 await picker 前占锁和暂停**

把 `onAlbum` 调整为：

```ts
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
```

保持 `handlingRef` 在 fail/result 状态为 true，只通过“重扫”或取消 picker 的
`reset()` 释放。

- [ ] **Step 5: 运行 Scanner 全文件测试**

Run:

```sh
yarn test src/__tests__/Scanner.test.tsx
```

Expected: 相册 pending、取消、双入口和原有相机/autoConfirm 测试全部通过。

- [ ] **Step 6: 提交并发修复**

```sh
git add src/__tests__/Scanner.test.tsx src/Scanner/Scanner.tsx
git commit -m "fix(scanner): serialize album scanning"
```

---

### Task 4: 权限恢复与 fatal camera error

**Files:**
- Create: `src/Scanner/ScanErrorOverlay.tsx`
- Modify: `src/Scanner/Scanner.tsx`
- Modify: `src/__tests__/Scanner.test.tsx`

**Interfaces:**
- Consumes: Task 1 的 `ScanError`；现有权限 helpers；React Native
  `AppState`/`Linking`；`HmsScanView.onScanError`。
- Produces: `ScannerProps.onScanError?: (error: ScanError) => void`；`error` phase；
  设置返回恢复；fatal error 卸载并重建相机。

- [ ] **Step 1: 为 AppState 和错误事件准备测试 harness**

测试文件从 React Native 增加 `AppState`、`Linking` import，并在每个测试前捕获 listener：

```ts
let appStateListener: ((state: string) => void) | undefined;

beforeEach(() => {
  appStateListener = undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    appStateListener = listener as (state: string) => void;
    return { remove: jest.fn() };
  });
  jest.spyOn(Linking, 'openSettings').mockResolvedValue();

  const perms = jest.requireMock('../permissions') as {
    getCameraPermissionStatus: jest.Mock;
    requestCameraPermission: jest.Mock;
  };
  perms.getCameraPermissionStatus.mockReset().mockResolvedValue('granted');
  perms.requestCameraPermission.mockReset().mockResolvedValue('granted');
});

afterEach(() => {
  jest.restoreAllMocks();
});
```

保留 decodeImage mock 的每测试默认实现，避免前一测试的实现泄漏。

- [ ] **Step 2: 写权限 helper reject 的失败测试**

```tsx
it('权限 helper reject 时 fail-closed 并通知宿主', async () => {
  const error = Object.assign(new Error('no activity'), { code: 'E_NO_ACTIVITY' });
  const perms = jest.requireMock('../permissions') as {
    getCameraPermissionStatus: jest.Mock;
  };
  perms.getCameraPermissionStatus.mockRejectedValueOnce(error);
  const onScanError = jest.fn();

  render(<Scanner onScanError={onScanError} />);

  expect(await screen.findByText('相机启动失败')).toBeTruthy();
  expect(screen.queryByTestId('hms-scan-view')).toBeNull();
  expect(onScanError).toHaveBeenCalledWith({
    code: 'E_NO_ACTIVITY',
    message: 'no activity',
  });
});
```

- [ ] **Step 3: 写设置返回与 view error 的失败测试**

加入三组：

```tsx
it('从设置授权返回后恢复取景', async () => {
  const perms = jest.requireMock('../permissions') as {
    getCameraPermissionStatus: jest.Mock;
    requestCameraPermission: jest.Mock;
  };
  perms.getCameraPermissionStatus
    .mockResolvedValueOnce('blocked')
    .mockResolvedValueOnce('granted');
  render(<Scanner />);
  fireEvent.press(await screen.findByText('去设置开启'));
  expect(Linking.openSettings).toHaveBeenCalled();

  await act(async () => appStateListener?.('active'));
  expect(await screen.findByText(HINT)).toBeTruthy();
  expect(screen.getByTestId('hms-scan-view')).toBeTruthy();
});

it('E_CAMERA_INIT 进入错误页，重试后重新挂载相机', async () => {
  const onScanError = jest.fn();
  render(<Scanner onScanError={onScanError} />);
  await screen.findByText(HINT);
  act(() => nativeProps().onScanError?.({ code: 'E_CAMERA_INIT', message: 'boom' }));
  expect(await screen.findByText('相机启动失败')).toBeTruthy();
  expect(screen.queryByTestId('hms-scan-view')).toBeNull();
  expect(onScanError).toHaveBeenCalledWith({ code: 'E_CAMERA_INIT', message: 'boom' });

  fireEvent.press(screen.getByText('重试'));
  expect(await screen.findByText(HINT)).toBeTruthy();
  expect(screen.getByTestId('hms-scan-view')).toBeTruthy();
});

it('E_NO_RESULT 只通知宿主并保持取景', async () => {
  const onScanError = jest.fn();
  render(<Scanner onScanError={onScanError} />);
  await screen.findByText(HINT);
  act(() => nativeProps().onScanError?.({ code: 'E_NO_RESULT', message: 'empty' }));
  expect(screen.getByText(HINT)).toBeTruthy();
  expect(screen.queryByText('相机启动失败')).toBeNull();
  expect(onScanError).toHaveBeenCalledWith({ code: 'E_NO_RESULT', message: 'empty' });
});
```

- [ ] **Step 4: 运行四组测试，确认全部先红**

Run:

```sh
yarn test src/__tests__/Scanner.test.tsx -t "helper reject|设置授权|E_CAMERA_INIT|E_NO_RESULT"
```

Expected: FAIL；当前 helper reject 进入 scan、AppState 不恢复、fatal error 被忽略，
`ScannerProps` 也尚无 `onScanError`。

- [ ] **Step 5: 创建专用错误页**

新增 `src/Scanner/ScanErrorOverlay.tsx`：

```tsx
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Empty,
  useThemedStyles,
  r,
  type ColorTokens,
} from '@unif/react-native-design';

interface ScanErrorOverlayProps {
  onClose?: () => void;
  onRetry: () => void;
}

export function ScanErrorOverlay({ onClose, onRetry }: ScanErrorOverlayProps) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.overlay}>
      <Empty
        icon="error-alert"
        title="相机启动失败"
        desc="无法启动扫码相机，请确认权限与设备状态后重试。"
      />
      <View style={styles.row}>
        {onClose && <Button label="取消" variant="ghost" block onPress={onClose} />}
        <Button label="重试" variant="primary" block onPress={onRetry} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', columnGap: r(12), marginTop: r(8) },
});

const makeStyles = (c: ColorTokens) =>
  StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 40,
      backgroundColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: r(40),
      rowGap: r(8),
    },
  });
```

- [ ] **Step 6: 实现错误归一、permission generation 和 AppState**

`Scanner.tsx` 增加 import：

```ts
import { AppState, Linking, StyleSheet, View } from 'react-native';
import type { BarcodeFormat, ScanError, ScanProduct, ScanResult } from '../types';
import { ScanErrorOverlay } from './ScanErrorOverlay';
```

扩展 phase/prop：

```ts
type Phase =
  | 'init'
  | 'scan'
  | 'detecting'
  | 'success'
  | 'fail'
  | 'denied'
  | 'error'
  | 'done';

export interface ScannerProps {
  // ...
  onScanError?: (error: ScanError) => void;
}
```

组件内新增 refs：

```ts
const permissionRunRef = useRef(0);
const waitingForSettingsRef = useRef(false);
const onScanErrorRef = useRef(onScanError);
onScanErrorRef.current = onScanError;
```

文件级错误归一：

```ts
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
```

实现稳定的 fatal/report 与权限流程：

```ts
const reportFatalError = useCallback((error: ScanError) => {
  setPhase('error');
  onScanErrorRef.current?.(error);
}, []);

const runPermissionFlow = useCallback(
  async (requestIfNeeded: boolean) => {
    const runId = ++permissionRunRef.current;
    const isCurrent = () =>
      mountedRef.current && permissionRunRef.current === runId;
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
```

初始 effect 在 cleanup 时同时置 `mountedRef=false` 和递增
`permissionRunRef.current`。AppState effect 只在 `waitingForSettingsRef` 为真时查询：

```ts
useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active' && waitingForSettingsRef.current) {
      waitingForSettingsRef.current = false;
      void runPermissionFlow(false);
    }
  });
  return () => subscription.remove();
}, [runPermissionFlow]);
```

设置与重试：

```ts
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
```

- [ ] **Step 7: 分流 view errors 并渲染 error phase**

```ts
const handleViewScanError = useCallback((error: ScanError) => {
  if (error.code === 'E_NO_CAMERA_PERMISSION') {
    setPhase('denied');
  } else if (error.code !== 'E_NO_RESULT') {
    setPhase('error');
  }
  onScanErrorRef.current?.(error);
}, []);
```

`error` 与 `init`/`denied` 一样不渲染 `<HmsScanView>` 或相机 top bar：

```tsx
{phase !== 'denied' && phase !== 'init' && phase !== 'error' && (
  <HmsScanView onScanError={handleViewScanError} ... />
)}

{phase === 'error' && (
  <ScanErrorOverlay onClose={onClose} onRetry={retryCamera} />
)}

{phase === 'denied' && (
  <DeniedOverlay onClose={onClose} onSettings={openSettings} />
)}
```

- [ ] **Step 8: 运行 Scanner 与 typecheck**

Run:

```sh
yarn test src/__tests__/Scanner.test.tsx
yarn typecheck
```

Expected: helper reject、设置恢复、fatal retry、soft error 和所有既有 Scanner 测试通过；
TypeScript 无 stale callback 或 AppState listener 类型错误。

- [ ] **Step 9: 提交错误恢复**

```sh
git add src/Scanner/ScanErrorOverlay.tsx src/Scanner/Scanner.tsx \
  src/__tests__/Scanner.test.tsx
git commit -m "fix(scanner): recover from camera errors"
```

---

### Task 5: 以原生回报校准手电状态

**Files:**
- Modify: `src/__tests__/Scanner.test.tsx`
- Modify: `src/Scanner/Scanner.tsx`

**Interfaces:**
- Consumes: `HmsScanView.onTorchStatus({ available, on })`。
- Produces: Scanner 工具栏的 `flash` 最终等于实际 `status.on`；隐藏按钮时请求关灯。

- [ ] **Step 1: 写实际手电状态的失败测试**

```tsx
it('原生回报未点亮时撤销已开灯状态', async () => {
  render(<Scanner />);
  await screen.findByText('扫一扫');
  fireEvent.press(screen.getByText('手电筒'));
  expect(screen.getByText('已开灯')).toBeTruthy();
  expect(nativeProps().torch).toBe(true);

  act(() => nativeProps().onTorchStatus?.({ available: true, on: false }));
  expect(screen.getByText('手电筒')).toBeTruthy();
  expect(nativeProps().torch).toBe(false);
});
```

再加 rerender：

```tsx
it('showTorch 关闭时主动请求关灯', async () => {
  const view = render(<Scanner showTorch />);
  await screen.findByText('扫一扫');
  fireEvent.press(screen.getByText('手电筒'));
  expect(nativeProps().torch).toBe(true);
  view.rerender(<Scanner showTorch={false} />);
  await waitFor(() => expect(nativeProps().torch).toBe(false));
  expect(screen.queryByText('已开灯')).toBeNull();
});
```

- [ ] **Step 2: 运行目标测试，确认先红**

Run:

```sh
yarn test src/__tests__/Scanner.test.tsx -t "原生回报|showTorch"
```

Expected: FAIL；当前没有传 `onTorchStatus`，且隐藏按钮不重置 torch。

- [ ] **Step 3: 实现原生状态回写与隐藏关灯**

```ts
useEffect(() => {
  if (!showTorch) setTorch(false);
}, [showTorch]);

const onTorchStatus = useCallback((status: { available: boolean; on: boolean }) => {
  setTorch(status.on);
}, []);
```

传给 view：

```tsx
<HmsScanView
  // ...
  torch={torch}
  onTorchStatus={onTorchStatus}
/>
```

不要用 `available` 控制按钮显隐，因为 Android 和 iOS 的该字段语义不同。

- [ ] **Step 4: 运行 Scanner 测试**

Run:

```sh
yarn test src/__tests__/Scanner.test.tsx
```

Expected: 实际状态与隐藏关灯回归通过，原有工具栏和结果状态测试保持通过。

- [ ] **Step 5: 提交手电修复**

```sh
git add src/__tests__/Scanner.test.tsx src/Scanner/Scanner.tsx
git commit -m "fix(scanner): sync actual torch status"
```

---

### Task 6: 同步公共文档与 llms 生成物

**Files:**
- Modify: `AGENTS.md`
- Verify/Modify if matched: `README.md`
- Modify: `website/docs/getting-started/quick-start.md`
- Modify: `website/docs/api/scanner.md`
- Modify: `website/docs/api/hms-scan-view.md`
- Modify: `website/docs/api/functions.md`
- Modify: `website/docs/api/types.md`
- Modify: `website/docs/guides/scanner.md`
- Modify: `website/docs/guides/permissions.md`
- Verify/Modify if matched: `website/docs/platform-differences.md`
- Generate/Verify (gitignored): `website/static/llms.txt`,
  `website/static/llms-full.txt`、`website/static/md/`

**Interfaces:**
- Consumes: Tasks 1-5 的最终公共行为与类型。
- Produces: 与实现一致的仓库说明、API 文档、权限排障和 AI 文档。

- [ ] **Step 1: 搜索全部旧事实**

Run:

```sh
rg -n "ToastHost|fail-open|E_NO_CAMERA_PERMISSION|autoConfirm|状态机|BarcodeFormat\\[\\]|formats|已开灯|ph://" \
  AGENTS.md README.md website/docs
```

记录每一处命中；不凭文件清单盲改未命中的页面。

- [ ] **Step 2: 校准 Scanner 自包含边界和状态机**

统一改为：

```text
<Scanner> 自带 ThemeProvider、权限流和状态机；ToastHost 由宿主在 App 根部按需挂载。
状态机：init → scan → detecting → success / fail / denied / error / done。
```

删除“自带 ToastHost”说明。补充：

- fatal permission/view error 进入 `error`，有重试。
- 从系统设置授权返回会自动重新查询。
- `E_NO_RESULT` 保持 soft error。
- `autoConfirm` 未传 `onConfirm` 时回退结果卡。

- [ ] **Step 3: 增加 Scanner onScanError API**

在 props 表和错误说明加入：

```ts
onScanError?: (error: ScanError) => void;
```

明确它是普通 `{ code, message }`，不是 `HmsScanError`；可收到
`E_CAMERA_INIT`、`E_NO_RESULT`、`E_NO_ACTIVITY` 或 `E_UNKNOWN`。

- [ ] **Step 4: 校准 readonly formats、手电与 URI**

类型表使用：

```ts
readonly BarcodeFormat[]
```

说明 Scanner 的手电标签最终以 `onTorchStatus.on` 为准，但
`available` 仍有双端不同语义。URI 表继续明确 iOS/Android 差异，确保任何源码/API
说明都不宣称 `ph://` 可用。

- [ ] **Step 5: 更新 AGENTS 当前事实**

至少改写：

- Scanner 的 `ThemeProvider/ToastHost` 描述。
- phase 清单。
- 权限 helper reject 和 view error 的旧 fail-open warning。
- 测试覆盖说明，加入设置返回、fatal error、相册并发、手电回写、readonly 类型。

不要修改共享 marker 区块，不改 iOS device-only、Huawei Maven、URI 空数组等无关事实。

- [ ] **Step 6: 重新生成 llms 文档**

Run:

```sh
yarn workspace @unif/react-native-hms-scan-website build:llms
```

Expected: exit 0；gitignored 生成物只反映本次 docs 变化，可用于本地内容核对但不提交。

- [ ] **Step 7: 检查不再存在失效描述**

Run:

```sh
rg -n "自带.*ToastHost|helper.*fail-open|只对.*E_NO_CAMERA_PERMISSION|formats\\?: BarcodeFormat\\[\\]" \
  AGENTS.md README.md website/docs website/static
```

Expected: 无失效命中；若命中历史对比或明确的迁移说明，逐条人工确认而不是忽略。

- [ ] **Step 8: 提交文档联动**

`build:llms` 输出由 `website/.gitignore` 明确忽略。先用 `git status --short` 确认没有
意外的 tracked 生成物，再只添加本任务文档：

```sh
git add AGENTS.md README.md website/docs
git commit -m "docs: align scanner recovery behavior"
```

如果 README 没有实际变化，不强行写入或制造格式噪音；不得 `git add -f`
`website/static` 的 llms 产物。

---

### Task 7: 完整验证与交付审查

**Files:**
- Verify: all files changed by Tasks 1-6
- No new implementation files unless a failing gate identifies a root cause

**Interfaces:**
- Consumes: 完整修复分支。
- Produces: 可交付的验证证据、干净 diff 和准确状态报告。

- [ ] **Step 1: 运行完整 JS 门禁**

Run:

```sh
yarn typecheck
yarn lint
env NPM_CONFIG_CACHE=/private/tmp/react-native-hms-scan-npm-cache yarn test
```

Expected:

- typecheck exit 0。
- lint 0 error、0 warning。
- iOS integration dry-run 通过。
- Jest 所有 suite/test 通过。

- [ ] **Step 2: 验证库构建**

Run:

```sh
yarn prepare
```

Expected: bob 的 ESM module 与 TypeScript declarations 构建成功；生成声明包含
`ScanError` 和 readonly formats。

- [ ] **Step 3: 检查生成声明**

Run:

```sh
rg -n "ScanError|readonly BarcodeFormat\\[\\]|onScanError" \
  lib/typescript/src/types.d.ts \
  lib/typescript/src/HmsScanView.d.ts \
  lib/typescript/src/Scanner/Scanner.d.ts
```

Expected: 三类公共契约与源码一致。

- [ ] **Step 4: 审查 diff 与工作区**

Run:

```sh
git diff --check
git status --short --branch
git diff origin/main...HEAD --stat
git diff origin/main...HEAD
```

逐项确认：

- 设计/计划提交与 Tasks 1-6 的 commits 均在任务分支。
- 没有 npm 版本、原生实现、依赖、lockfile 或无关格式变化。
- `lib/` 若为 ignored build 产物，不强行提交；以源码和 prepare 结果为准。
- 外部全局 `hms-scan` Skill 没有被修改，并在交付说明报告需要源仓同步的两处描述。

- [ ] **Step 5: 根据真实输出报告结果**

报告：

- 修复的九项行为。
- 新增/修改测试数量和完整 Jest 计数。
- typecheck、lint、test、prepare、llms 的 exit 状态。
- 未执行的真机 smoke test（若当前无设备），不得暗示已验证硬件行为。
- 当前 branch、commits 和工作区是否干净。

若任一门禁失败，保留原始非零状态，回到对应 Task 的 root cause 与 TDD cycle；不得
使用 `|| true`、`exit 0` 或删除测试掩盖失败。
