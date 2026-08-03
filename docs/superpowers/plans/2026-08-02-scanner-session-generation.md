# Scanner Session Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 阻止上一扫码 session 的迟到相机 callback 在 retry、权限恢复或 reset 后进入新扫码流程。

**Architecture:** 在 `ScannerInner` 中增加单调递增的 scan session generation。ref 负责同步失效旧 callback，state 负责让每轮 render 的 `onCameraResult` 捕获自己的 session id；现有 boolean 继续处理同一 session 内的同步防重入，processing generation 继续保护异步 await 链。

**Tech Stack:** React Native 0.85、React 19 hooks、TypeScript 6、Jest 29、`@testing-library/react-native`

## Global Constraints

- 仅支持 RN 新架构，不修改 Fabric / TurboModule schema 或双端原生接口。
- 不修改公共 API、website、llms 或 hms-scan Skill；这是既有 Scanner 契约的内部竞态修复。
- fatal → retry、denied → 设置授权恢复、success / fail → reset 后，上一 session 的迟到 callback 必须被拒绝。
- 当前 session 的 callback 必须继续正常进入解析与确认流程。
- 保留现有 permission generation、processing generation、相册串行化、soft / fatal / denied 错误路由与 `autoConfirm` 语义。
- 使用 TDD：新增测试必须先在当前实现上因旧 callback 被接受而失败，再实现最小修复。
- 只使用 yarn；不 push、merge、创建 PR、release 或执行真机 smoke。

---

### Task 1: 用 scan session generation 隔离迟到相机结果

**Files:**
- Modify: `src/__tests__/Scanner.test.tsx`
- Modify: `src/Scanner/Scanner.tsx`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: `enterScan()`、`enterDenied()`、`reportFatalError()`、`retryCamera()`、`onCameraResult()` 与现有 `acceptingResultsRef` / `processingRunRef`
- Produces: 内部 `scanSessionRef`、`scanSession` 和 `invalidateScanSession()`；不产生新的 public export 或 prop

- [ ] **Step 1: 写三条跨 session 的失败行为测试**

在 `src/__tests__/Scanner.test.tsx` 中紧接现有
`fatal 后忽略卸载前已排队的相机结果` 测试，加入以下三条测试。三条名称都包含
`上一相机 session`，方便单独执行 RED / GREEN：

```tsx
it('fatal 重试后拒绝上一相机 session 的迟到结果', async () => {
  const resolveProduct = jest.fn(async () => ({ name: '商品' }));
  const onConfirm = jest.fn();
  render(
    <Scanner
      autoConfirm
      resolveProduct={resolveProduct}
      onConfirm={onConfirm}
    />
  );
  await screen.findByText(HINT);
  const staleResult = nativeProps().onScanResult;

  act(() =>
    nativeProps().onScanError?.({ code: 'E_CAMERA_INIT', message: 'boom' })
  );
  fireEvent.press(await screen.findByText('重试'));
  await screen.findByText(HINT);
  const currentResult = nativeProps().onScanResult;

  await act(async () =>
    staleResult?.([{ value: 'stale', format: 'QR_CODE' }])
  );
  expect(resolveProduct).not.toHaveBeenCalled();
  expect(onConfirm).not.toHaveBeenCalled();

  await act(async () =>
    currentResult?.([{ value: 'fresh', format: 'QR_CODE' }])
  );
  await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  expect(onConfirm.mock.calls[0][1]).toEqual({
    value: 'fresh',
    format: 'QR_CODE',
  });
});

it('权限恢复后拒绝上一相机 session 的迟到结果', async () => {
  const resolveProduct = jest.fn(async () => ({ name: '商品' }));
  const onConfirm = jest.fn();
  render(
    <Scanner
      autoConfirm
      resolveProduct={resolveProduct}
      onConfirm={onConfirm}
    />
  );
  await screen.findByText(HINT);
  const staleResult = nativeProps().onScanResult;

  act(() =>
    nativeProps().onScanError?.({
      code: 'E_NO_CAMERA_PERMISSION',
      message: 'permission missing',
    })
  );
  fireEvent.press(await screen.findByText('去设置开启'));
  await act(async () => appStateListener?.('active'));
  await screen.findByText(HINT);
  const currentResult = nativeProps().onScanResult;

  await act(async () =>
    staleResult?.([{ value: 'stale', format: 'QR_CODE' }])
  );
  expect(resolveProduct).not.toHaveBeenCalled();
  expect(onConfirm).not.toHaveBeenCalled();

  await act(async () =>
    currentResult?.([{ value: 'fresh', format: 'QR_CODE' }])
  );
  await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  expect(onConfirm.mock.calls[0][1]).toEqual({
    value: 'fresh',
    format: 'QR_CODE',
  });
});

it('重扫后拒绝上一相机 session 的迟到结果', async () => {
  const resolveProduct = jest.fn(async () => ({ name: '商品' }));
  render(<Scanner resolveProduct={resolveProduct} />);
  await screen.findByText(HINT);
  const staleResult = nativeProps().onScanResult;

  await act(async () =>
    staleResult?.([{ value: 'first', format: 'QR_CODE' }])
  );
  await screen.findByText('商品');
  fireEvent.press(screen.getByText('重扫'));
  await screen.findByText(HINT);
  const currentResult = nativeProps().onScanResult;
  resolveProduct.mockClear();

  await act(async () =>
    staleResult?.([{ value: 'stale', format: 'QR_CODE' }])
  );
  expect(resolveProduct).not.toHaveBeenCalled();
  expect(screen.getByText(HINT)).toBeTruthy();

  await act(async () =>
    currentResult?.([{ value: 'fresh', format: 'QR_CODE' }])
  );
  await waitFor(() =>
    expect(resolveProduct).toHaveBeenCalledWith({
      value: 'fresh',
      format: 'QR_CODE',
    })
  );
});
```

- [ ] **Step 2: 运行目标测试并确认 RED 原因正确**

Run:

```bash
yarn test src/__tests__/Scanner.test.tsx --runInBand -t "上一相机 session"
```

Expected:

- 新增三条测试均 FAIL。
- 失败原因是旧 callback 调用了 `resolveProduct` / `onConfirm`，不是测试语法、mock
  初始化或权限流程错误。
- 记录实际 passed / failed / skipped 计数到 task report。

- [ ] **Step 3: 实现最小 scan session generation**

在 `src/Scanner/Scanner.tsx` 的 Scanner refs 中增加：

```tsx
const [scanSession, setScanSession] = useState(0);
const scanSessionRef = useRef(0);
```

在 `invalidateProcessing` 之后增加同步 session 失效 helper：

```tsx
const invalidateScanSession = useCallback(() => {
  ++scanSessionRef.current;
  acceptingResultsRef.current = false;
}, []);
```

调整 `enterScan()`：保留 processing 失效、handling lock 释放、product /
lastResult 清空，并分配新 session。不要先调用 `invalidateScanSession()` 再额外递增；
下面的一次递增同时完成旧 session 失效和新 session 分配：

```tsx
const enterScan = useCallback(() => {
  invalidateProcessing();
  handlingRef.current = false;
  const sessionId = ++scanSessionRef.current;
  acceptingResultsRef.current = true;
  setScanSession(sessionId);
  setProduct(null);
  lastResultRef.current = null;
  setPhase('scan');
}, [invalidateProcessing]);
```

在以下退出 / 恢复边界用 `invalidateScanSession()` 替代直接把
`acceptingResultsRef.current` 设为 `false`：

- `enterDenied()`
- `reportFatalError()`
- Scanner effect cleanup（unmount）
- `retryCamera()`

把 `invalidateScanSession` 加入对应 callback / effect dependency arrays。

最后让 `onCameraResult` 在现有 phase / boolean / handling checks 之前校验它捕获的
session：

```tsx
if (
  scanSession !== scanSessionRef.current ||
  phase !== 'scan' ||
  !acceptingResultsRef.current ||
  handlingRef.current
) {
  return;
}
```

并把 `scanSession` 加入 `onCameraResult` dependencies。不要删除现有
`acceptingResultsRef` 或 `processingRunRef`：前者负责同一 session 同步防重入，后者负责
异步处理链失效。

- [ ] **Step 4: 运行目标测试并确认 GREEN**

Run:

```bash
yarn test src/__tests__/Scanner.test.tsx --runInBand -t "上一相机 session"
```

Expected:

- 三条目标测试全部 PASS。
- fatal retry、权限恢复、重扫后的当前 callback 都仍能正常处理 fresh 结果。

然后运行 Scanner 全文件：

```bash
yarn test src/__tests__/Scanner.test.tsx --runInBand
```

Expected: `33 / 33` tests PASS，零 snapshots。

- [ ] **Step 5: 同步仓库内部维护约束**

更新 `AGENTS.md`：

- Scanner 状态机条目明确：除了 processing generation，scan session generation
  还会拒绝 retry、设置恢复或 reset 后到达的旧 view callback。
- 测试条目加入“跨 scan session 迟到 callback”覆盖。

不修改 README、website、llms、Skill 或 native 文件，因为 public API、平台配置和用户
可见行为契约没有变化。

- [ ] **Step 6: 运行完整门禁**

Run:

```bash
yarn typecheck
yarn lint
NPM_CONFIG_CACHE=/private/tmp/react-native-hms-scan-npm-cache yarn test --runInBand
yarn prepare
git diff --check
```

Expected:

- typecheck / lint / prepare / `git diff --check` exit 0。
- `yarn test` 自动执行 Android 与 iOS integration contracts，然后 Jest
  `5 suites / 50 tests` 全部 PASS。
- Bob 继续生成 ESM module 与 TypeScript declarations；不强制提交 ignored `lib/`。

- [ ] **Step 7: 自审并提交**

自审：

- 测试从用户可见 phase / callback 行为证明跨 session 隔离，不断言内部 generation。
- ref 在 fatal / denied / retry / unmount 同步失效；state 只负责生成捕获 token 的新
  callback。
- 当前 session callback 可用，旧 session callback 在恢复后仍被拒绝。
- diff 仅包含 `Scanner.tsx`、`Scanner.test.tsx`、`AGENTS.md`。

Commit:

```bash
git add src/Scanner/Scanner.tsx src/__tests__/Scanner.test.tsx AGENTS.md
git commit -m "fix(scanner): isolate scan result sessions"
```
