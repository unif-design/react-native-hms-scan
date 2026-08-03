# HMS Scan Example 三能力展厅 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把单一 Scanner 页面改造成基于 Design 0.20 的 Scanner、HmsScanView、decodeImage 三能力产品化展厅，并迁移到 RN 0.86.2。

**Architecture:** example 使用本地 typed stack；Scanner feature 组合公开成品页，headless feature 用纯 reducer 管理权限/控制/结果，decode feature 用 token 化状态机处理 picker 与图片解码。根 Provider、导航和共享 Design scaffold 统一装配，三 feature 之间不互相 import。

**Tech Stack:** React Native 0.86.2、React 19.2.3、TypeScript 6、Jest 29、Testing Library、`@unif/react-native-hms-scan`、`@unif/react-native-design@0.20.0`、`react-native-image-picker@8.2.1`。

## Global Constraints

- 根开发/测试图与 example 使用 RN `0.86.2`、React `19.2.3`、Design `0.20.0`；匹配的 `@react-native/*` preset/config 为 `0.86.2`，CLI 为 `20.1.0`。
- hms-scan 公共 API、错误语义和全部 public `peerDependencies` 保持不变；image-picker 只进入 example runtime dependency。
- 只使用 `<Scanner>`、`<HmsScanView>`、`decodeImage`、`getCameraPermissionStatus`、`requestCameraPermission` 等公开 barrel；不得深路径导入。
- Design 组件只从包根导入；颜色只用 `useColors()`，样式只用模块顶层 `makeStyles` + `useThemedStyles()`；不得新增硬编码 hex/rgba、RN `Pressable + Text` 等价控件或 `console.*`。
- `decodeImage([])` 是正常空态；只有 reject 才是错误。`HmsScanView.onScanError` 是普通 `ScanError`，不得当成 `HmsScanError`。
- iOS 仅支持 physical device；不得伪造 simulator slice、修改 framework 平台标记或增加 Podfile 绕过。
- Android 保留 Huawei Maven、minSdk 24、新架构；非华为 Android 无需 HMS Core、agconnect、API Key。
- headless 只在相机权限 `granted` 时挂载；Android blocked 只能从 request 结果判断，iOS 查询不返回 denied。
- Carousel 5 / RNGH 3 只保留精确 scoped 例外；禁止 `--force`、`--legacy-peer-deps` 和全局 override。
- 根 Jest 必须发现 example tests；根 lint 必须覆盖 example 源码，不能以 ignore 维持绿色。
- 所有行为代码遵循 TDD；依赖/native 配置先通过可执行 integration contract 获得 RED。

---

### Task 1: 迁移 RN 0.86.2、Design 0.20 与 image-picker 依赖图

**Files:**
- Modify: `package.json`
- Modify: `example/package.json`
- Modify: `yarn.lock`
- Modify: `eslint.config.mjs`
- Modify: `scripts/verify-android-integration.mjs`
- Modify: `scripts/verify-ios-integration.mjs`
- Modify: `example/android/settings.gradle`
- Modify: `example/android/build.gradle`
- Modify: `example/android/gradle.properties`
- Modify: `example/android/gradle/wrapper/gradle-wrapper.properties`
- Modify: `example/android/app/build.gradle`
- Modify: `example/android/app/src/main/java/unif/reactnativehmsscan/example/MainActivity.kt`
- Modify: `example/android/app/src/main/java/unif/reactnativehmsscan/example/MainApplication.kt`
- Modify: `example/ios/Podfile`
- Modify: `example/ios/ReactNativeHmsScanExample/AppDelegate.swift`
- Modify: `example/ios/ReactNativeHmsScanExample.xcodeproj/project.pbxproj`
- Modify: `example/ios/Podfile.lock`

**Interfaces:**
- Consumes: Design 0.20 的 RN/React contract、现有 ScanKit device-only Pod、Huawei Maven/new-arch/minSdk 配置。
- Produces: 单一 RN 0.86.2 根/example 运行图、Design 0.20 兼容 peers、example direct image-picker，以及 public peers 原样不变。

- [ ] **Step 1: 扩展依赖/native contract 得到 RED**

在 Android integration script 中解析根/example manifest 并断言：

```js
assert.equal(rootPackage.devDependencies['react-native'], '0.86.2');
assert.equal(examplePackage.dependencies['react-native'], '0.86.2');
assert.equal(examplePackage.dependencies['@unif/react-native-design'], '0.20.0');
assert.equal(
  examplePackage.dependencies['@unif/react-native-hms-scan'],
  'workspace:*'
);
assert.equal(examplePackage.dependencies['react-native-image-picker'], '8.2.1');
assert.equal(examplePackage.dependencies['react-native-gesture-handler'], '^3.1.0');
assert.equal(rootPackage.peerDependencies['@unif/react-native-design'], '>=0.8.0');
assert.equal(rootPackage.peerDependencies['react-native'], '>=0.80.0');
```

在 iOS integration script 中断言 example RN preset/config `0.86.2`、CLI `20.1.0`、
Pod lock 仍含 `ScanKitFrameWork (1.1.2.305)`。用 JSON parse 比较字段，不用模糊文本匹配。

- [ ] **Step 2: 运行 RED**

Run:

```sh
yarn verify:android-integration
yarn verify:ios-integration
```

Expected: FAIL，明确指出 Design/RN/RNGH/image-picker 仍是旧值；不能接受脚本语法错误。

- [ ] **Step 3: 更新 manifest 与 lockfile**

根 dev 和 example runtime 对齐：

```json
{
  "@unif/react-native-hms-scan": "workspace:*",
  "@unif/react-native-design": "0.20.0",
  "react": "19.2.3",
  "react-native": "0.86.2",
  "react-native-gesture-handler": "^3.1.0",
  "react-native-reanimated": "^4.5.3",
  "react-native-reanimated-carousel": "^5.0.0",
  "react-native-safe-area-context": "^5.7.0",
  "react-native-svg": "^15.15.5",
  "react-native-worklets": "^0.11.3"
}
```

example 增加精确 `"react-native-image-picker": "8.2.1"`；根 `@react-native` Babel/Jest/
ESLint preset 与 example Babel/Jest/Metro/TypeScript preset 改为 `0.86.2`。公共 peer
字段一字不改。移除 `eslint.config.mjs` 的 `example/**` ignore，保留 generated、
node_modules、website ignore。

- [ ] **Step 4: 迁移 native shell**

以本机 design repo 的 RN 0.86.2 example 为参考逐项迁移 Android/iOS shell，保留：

```text
Android: Huawei Maven、minSdk 24、newArchEnabled、applicationId
iOS: physical-device scripts、ScanKitFrameWork Pod、bundle id
两端: hms-scan Codegen/autolinking 与现有权限边界
```

Run:

```sh
yarn install
bundle exec pod install --project-directory=example/ios
```

- [ ] **Step 5: 运行 GREEN 与 immutable 复验**

Run:

```sh
yarn verify:android-integration
yarn verify:ios-integration --require-lock
yarn install --immutable
yarn typecheck
yarn lint
```

Expected: 全部 exit 0；只剩精确批准的 Carousel/RNGH warning。

- [ ] **Step 6: 提交**

```sh
git diff --check
git status --short
git commit -m "chore: align scan example dependencies"
```

---

### Task 2: 实现 typed navigation、format preset 与 Scanner 领域适配

**Files:**
- Create: `example/src/navigation/exampleNavigation.ts`
- Create: `example/src/showcases/scanner/scannerModel.ts`
- Create: `example/src/showcases/scanner/products.ts`
- Create: `example/src/shared/formatPresets.ts`
- Create: `example/src/__tests__/exampleNavigation.test.ts`
- Create: `example/src/__tests__/scannerModel.test.ts`

**Interfaces:**
- Consumes: `BarcodeFormat`、`ScanProduct`、`ScanResult`、`ScanError`。
- Produces:
  - `ExampleRoute`、`NavigationState`、`navigationReducer`、`canGoBack`
  - `FormatPresetId = 'all' | 'qr' | 'retail'`
  - `formatsForPreset(id): readonly BarcodeFormat[] | undefined`
  - `lookupDemoProduct(result): Promise<ScanProduct | null>`
  - `ScannerDemoState`、`scannerDemoReducer`

- [ ] **Step 1: 写 navigation RED**

```ts
expect(
  navigationReducer(
    { stack: [{ name: 'home' }] },
    { type: 'navigate', route: { name: 'scanner' } }
  )
).toEqual({ stack: [{ name: 'home' }, { name: 'scanner' }] });

expect(
  navigationReducer({ stack: [{ name: 'home' }] }, { type: 'back' })
).toEqual({ stack: [{ name: 'home' }] });
expect(canGoBack({ stack: [{ name: 'home' }] })).toBe(false);
```

路由联合固定为 `home/scanner/headless/decode-image`；子页 back pop 到 home。
Android handler 在 `canGoBack(state)` 为 true 时 dispatch back 并返回 true，根页返回 false。

- [ ] **Step 2: 写 format/product RED**

```ts
expect(formatsForPreset('all')).toBeUndefined();
expect(formatsForPreset('qr')).toEqual(['QR_CODE']);
expect(formatsForPreset('retail')).toEqual([
  'EAN_8',
  'EAN_13',
  'UPC_A',
  'UPC_E',
  'CODE_128',
]);

await expect(
  lookupDemoProduct({ value: '6925303773908', format: 'EAN_13', contentType: 'OTHER' })
).resolves.toMatchObject({
  name: '阿萨姆原味奶茶 500ml',
  barcode: '6925303773908',
});
```

使用完整真实 `ScanResult` 字段，以当前 `src/types.ts` 为准；未命中必须 resolve `null`，
不得伪造“未知商品”。

- [ ] **Step 3: 写 Scanner 状态 RED**

覆盖 preset、autoConfirm、enter/close、confirmed result、普通 `ScanError`：

```ts
expect(
  scannerDemoReducer(initialScannerDemoState, {
    type: 'confirmed',
    product,
    result,
  })
).toMatchObject({
  active: false,
  lastConfirmed: { product, result },
});
```

`E_NO_RESULT` 保存为 soft feedback；错误对象类型只含 `{code,message}`，测试不得构造
`HmsScanError`。

- [ ] **Step 4: 运行 RED**

Run:

```sh
yarn test example/src/__tests__/exampleNavigation.test.ts example/src/__tests__/scannerModel.test.ts --runInBand
```

Expected: FAIL，原因是目标模块不存在。

- [ ] **Step 5: 写最小实现**

```ts
export type ScannerDemoState = {
  active: boolean;
  preset: FormatPresetId;
  autoConfirm: boolean;
  lastConfirmed: { product: ScanProduct; result: ScanResult } | null;
  lastError: ScanError | null;
};
```

商品表只含可复现 fixture；`lookupDemoProduct` 返回新对象避免调用方修改共享表。reducer
不调用 Scanner API，不吞 `onConfirm` throw；UI 使用同步 onConfirm 保存结果后退出。

- [ ] **Step 6: 运行 GREEN 并提交**

Run:

```sh
yarn test example/src/__tests__/exampleNavigation.test.ts example/src/__tests__/scannerModel.test.ts --runInBand
yarn typecheck
yarn lint
git diff --check
```

```sh
git commit -m "feat: add scanner example model"
```

---

### Task 3: 实现 HmsScanView 权限、控制、结果与错误状态机

**Files:**
- Create: `example/src/showcases/headless/headlessState.ts`
- Create: `example/src/showcases/headless/headlessController.ts`
- Create: `example/src/__tests__/headlessState.test.ts`
- Create: `example/src/__tests__/headlessController.test.ts`

**Interfaces:**
- Consumes: `CameraPermissionStatus`、`ScanResult`、`ScanError`、`TorchStatus`、公开权限 helper。
- Produces:
  - `PermissionPhase = 'checking' | 'requesting' | 'granted' | 'denied' | 'blocked' | 'error'`
  - `HeadlessState`、`HeadlessSnapshot`、`headlessReducer`
  - `createHeadlessController(deps)`，提供 `check/request/openSettings/onAppActive`

- [ ] **Step 1: 写 permission RED**

逐平台使用 literal 状态：

```ts
expect(
  headlessReducer(initialHeadlessState, {
    type: 'permissionChecked',
    status: 'undetermined',
    os: 'ios',
  }).permission
).toBe('denied');

expect(
  headlessReducer(initialHeadlessState, {
    type: 'permissionRequested',
    status: 'blocked',
  }).permission
).toBe('blocked');
```

这里 UI phase 用 `denied` 表示“可请求”，但保留 native status 字段
`'undetermined'`，不得声称 iOS 返回 denied。Android query denied 也进入可请求态；
blocked 只允许 request 结果产生。

- [ ] **Step 2: 写控制/结果/error RED**

```ts
const scanned = headlessReducer(grantedState, {
  type: 'scanResults',
  results: [qrResult, qrResult, eanResult],
});
expect(scanned.results.map((item) => `${item.format}:${item.value}`)).toEqual([
  `${eanResult.format}:${eanResult.value}`,
  `${qrResult.format}:${qrResult.value}`,
]);
expect(scanned.paused).toBe(true);
```

非 continuous 命中后 paused；continuous 不暂停。torch request 与
`onTorchStatus({available,on})` 分开保存。`E_NO_RESULT` 只 feedback；
`E_NO_CAMERA_PERMISSION` 触发 `needsPermissionRecheck: true`；其他 error 暂停并可重试。

- [ ] **Step 3: 写 controller RED**

注入：

```ts
type HeadlessDeps = {
  getStatus: () => Promise<CameraPermissionStatus>;
  request: () => Promise<CameraPermissionStatus>;
  openSettings: () => Promise<void>;
};
```

验证初次只 query；用户动作才 request；helper reject 保存普通 error phase；
`openSettings` 成功不直接假设 granted，App active 时重新 query；未 granted 的 snapshot
`shouldMountView` 为 false。

- [ ] **Step 4: 运行 RED**

Run:

```sh
yarn test example/src/__tests__/headlessState.test.ts example/src/__tests__/headlessController.test.ts --runInBand
```

Expected: FAIL，原因是模块不存在。

- [ ] **Step 5: 实现最小 reducer/controller**

```ts
export type HeadlessState = {
  permission: PermissionPhase;
  nativePermission: CameraPermissionStatus | null;
  paused: boolean;
  continuous: boolean;
  torchRequested: boolean;
  torchStatus: TorchStatus;
  results: readonly ScanResult[];
  error: ScanError | null;
  needsPermissionRecheck: boolean;
};

export type HeadlessSnapshot = HeadlessState & {
  shouldMountView: boolean;
  canRequest: boolean;
};
```

用递增 operation token 拒绝迟到 query/request；result 以 `format:value` 去重、新结果在前，
上限 20。controller 不 import React。

- [ ] **Step 6: 运行 GREEN 并提交**

Run:

```sh
yarn test example/src/__tests__/headlessState.test.ts example/src/__tests__/headlessController.test.ts --runInBand
yarn typecheck
yarn lint
git diff --check
```

```sh
git commit -m "feat: add headless scan state machine"
```

---

### Task 4: 实现 image-picker adapter 与 decodeImage 状态机

**Files:**
- Create: `example/src/shared/pickLocalImage.ts`
- Create: `example/src/showcases/decode-image/decodeState.ts`
- Create: `example/src/showcases/decode-image/decodeController.ts`
- Create: `example/src/__tests__/pickLocalImage.test.ts`
- Create: `example/src/__tests__/decodeState.test.ts`
- Create: `example/src/__tests__/decodeController.test.ts`

**Interfaces:**
- Consumes: `launchImageLibrary`、`decodeImage`、`HmsScanError`、`ScanResult`。
- Produces:
  - `pickLocalImage(): Promise<string | null>`
  - `DecodePhase = 'idle' | 'picking' | 'decoding' | 'empty' | 'success' | 'error'`
  - `DecodeState`、`decodeReducer`
  - `createDecodeController(deps): DecodeController`

- [ ] **Step 1: 写 picker RED**

只 mock image-picker 外部边界，完整镜像响应：

```ts
mockLaunch.mockResolvedValueOnce({
  didCancel: false,
  assets: [
    {
      uri: 'content://media/external/images/1',
      fileName: 'qr.png',
      type: 'image/png',
      width: 512,
      height: 512,
      fileSize: 1024,
    },
  ],
});
await expect(pickLocalImage()).resolves.toBe(
  'content://media/external/images/1'
);
```

断言调用 options 精确为 `{mediaType:'photo', selectionLimit:1}`；cancel、空 assets、无 uri
返回 null，不请求 base64。

- [ ] **Step 2: 写 decode RED**

用 official package mock，然后按测试覆写 `decodeImage`：

```ts
jest.mock('@unif/react-native-hms-scan', () =>
  require('@unif/react-native-hms-scan/mock')
);

(decodeImage as jest.Mock).mockResolvedValueOnce([]);
await controller.pickAndDecode(['QR_CODE']);
expect(controller.getSnapshot().phase).toBe('empty');
```

成功展示所有结果；`new HmsScanError('E_IMAGE_LOAD_FAILED', 'load failed')` 保存 code/message；
普通 picker Error 使用 `kind:'unexpected'`，不伪造 HMS code。两个并发选择只允许最新 token
提交，pending 时 `canStart: false`。

- [ ] **Step 3: 运行 RED**

Run:

```sh
yarn test example/src/__tests__/pickLocalImage.test.ts example/src/__tests__/decodeState.test.ts example/src/__tests__/decodeController.test.ts --runInBand
```

Expected: FAIL，原因是三个模块不存在。

- [ ] **Step 4: 写最小实现**

```ts
export type DecodeState = {
  phase: DecodePhase;
  selectedUri: string | null;
  results: readonly ScanResult[];
  error:
    | { kind: 'hms'; code: HmsScanErrorCode; message: string }
    | { kind: 'unexpected'; message: string }
    | null;
  activeToken: number;
};

export type DecodeController = {
  pickAndDecode: (formats?: readonly BarcodeFormat[]) => Promise<void>;
  getSnapshot: () => DecodeState;
  subscribe: (listener: () => void) => () => void;
};
```

controller 只把 picker 返回的本地 URI 传给 `decodeImage(uri, {formats})`（全部 preset 时
省略 options）；`[]` dispatch empty，不 throw/toast error。

- [ ] **Step 5: 运行 GREEN 并提交**

Run:

```sh
yarn test example/src/__tests__/pickLocalImage.test.ts example/src/__tests__/decodeState.test.ts example/src/__tests__/decodeController.test.ts --runInBand
yarn typecheck
yarn lint
git diff --check
```

```sh
git commit -m "feat: add image decode example flow"
```

---

### Task 5: 组合根 Provider、首页与 Scanner Design 页面

**Files:**
- Create: `example/src/app/AppProviders.tsx`
- Create: `example/src/shared/ShowcaseScaffold.tsx`
- Create: `example/src/shared/FormatSelector.tsx`
- Create: `example/src/screens/HomeScreen.tsx`
- Create: `example/src/showcases/scanner/ScannerShowcaseScreen.tsx`
- Create: `example/src/app/ExampleRouter.tsx`
- Replace: `example/src/App.tsx`
- Create: `example/src/__tests__/App.test.tsx`
- Create: `example/src/__tests__/ScannerShowcaseScreen.test.tsx`

**Interfaces:**
- Consumes: Tasks 2–4 的 routes、format preset、scanner/decode/headless controllers。
- Produces:
  - 根 Provider、首页三入口、Scanner 配置/全屏流程和 Android hardware back 路由
  - `buildScannerProps(state, insets, callbacks): ScannerProps`

- [ ] **Step 1: 写 App/Home RED**

用 official hms mock 渲染真实 App：

```ts
jest.mock('@unif/react-native-hms-scan', () =>
  require('@unif/react-native-hms-scan/mock')
);

render(<App />);
expect(screen.getByText('同一个 SDK 的三种使用层级')).toBeTruthy();
fireEvent.press(screen.getByRole('button', { name: /Scanner 成品页/ }));
expect(screen.getByText('Scanner 配置')).toBeTruthy();
```

覆盖三入口、返回与 hardware back；首页初次渲染不调用权限 helper/image picker/decodeImage。
不要断言 mock Scanner 的内部 UI。

- [ ] **Step 2: 写 Scanner wiring RED**

因为 official mock Scanner 渲染 null，测试 screen 传给 `ScannerComponent` 的 public props
adapter，而不是断言 mock 元素：

```ts
expect(buildScannerProps(state, insets, callbacks)).toMatchObject({
  title: '扫一扫',
  formats: ['QR_CODE'],
  topInset: 24,
  bottomInset: 16,
  autoConfirm: true,
});
```

调用 `onConfirm(product,result)` 后同步保存 lastConfirmed 并退出；`pickImage` 返回共享
adapter；`onScanError` 保存普通 error；关闭回配置页。

- [ ] **Step 3: 运行 RED**

Run:

```sh
yarn test example/src/__tests__/App.test.tsx example/src/__tests__/ScannerShowcaseScreen.test.tsx --runInBand
```

Expected: FAIL，因为新 App/页面不存在。

- [ ] **Step 4: 实现 Provider/scaffold/home**

根顺序：

```tsx
<GestureHandlerRootView style={rootStyles.root}>
  <SafeAreaProvider>
    <ThemeProvider>
      <ExampleRouter />
      <ToastHost />
    </ThemeProvider>
  </SafeAreaProvider>
</GestureHandlerRootView>
```

`react-native-gesture-handler` 在 `example/index.js` 首行 import。Home 用三个 `EntryCard` 和
`Tag`；scaffold 用 `NavBar`，icon-only 返回提供 `accessibilityLabel="返回"`。不挂
`ConfirmHost`。

- [ ] **Step 5: 实现 Scanner 页面**

配置使用 `Segmented`、`Switch`、`Card`。全屏时只渲染：

```tsx
<Scanner
  {...buildScannerProps(state, insets, {
    onClose,
    onConfirm,
    onScanError,
    pickImage: pickLocalImage,
    resolveProduct: lookupDemoProduct,
  })}
/>
```

`onConfirm` 必须同步且不 throw；autoConfirm 开关两条路径都保存完整 product/result。

- [ ] **Step 6: 运行 GREEN 并提交**

Run:

```sh
yarn test example/src/__tests__/App.test.tsx example/src/__tests__/ScannerShowcaseScreen.test.tsx --runInBand
yarn typecheck
yarn lint
rg -n "console\\.|#[0-9A-Fa-f]{3,8}|rgba\\(|\\bPressable\\b" example/src
git diff --check
```

Expected: 测试/typecheck/lint exit 0；rg 无命中。

```sh
git commit -m "feat: build scanner showcase shell"
```

---

### Task 6: 完成 headless/decode Design 页面与原生配置 contract

**Files:**
- Create: `example/src/showcases/headless/HeadlessShowcaseScreen.tsx`
- Create: `example/src/showcases/decode-image/DecodeImageShowcaseScreen.tsx`
- Create: `example/src/__tests__/HeadlessShowcaseScreen.test.tsx`
- Create: `example/src/__tests__/DecodeImageShowcaseScreen.test.tsx`
- Modify: `example/src/app/ExampleRouter.tsx`
- Modify: `example/ios/ReactNativeHmsScanExample/Info.plist`
- Modify: `example/android/app/src/main/AndroidManifest.xml`
- Modify: `scripts/verify-android-integration.mjs`
- Modify: `scripts/verify-ios-integration.mjs`

**Interfaces:**
- Consumes: Task 3 headless controller、Task 4 decode controller、Task 5 scaffold/router。
- Produces: 两个完整 Design 页面；iOS camera/photo 用途说明、无 location；Android config 保持 Huawei/new-arch/minSdk 且无 location。

- [ ] **Step 1: 写 headless 页面 RED**

页面给实际预览容器稳定的 `testID="headless-preview"`；测试只在 granted snapshot 看到
该容器，denied/blocked/error 时不挂：

```ts
expect(screen.queryByTestId('headless-preview')).toBeNull();
fireEvent.press(screen.getByRole('button', { name: '申请相机权限' }));
await waitFor(() => expect(requestCameraPermission).toHaveBeenCalledTimes(1));
await waitFor(() =>
  expect(screen.getByTestId('headless-preview')).toBeTruthy()
);
```

覆盖 paused/continuous/torchRequested 受控切换、torch requested 与 actual on 分开显示、
非连续命中后“继续扫描”、soft/fatal error。

- [ ] **Step 2: 写 decode 页面 RED**

覆盖 picking/decoding 时按钮 disabled，官方 mock 默认 `[]` 显示
“图片中未识别到条码”而非错误；success 列出 value/format/contentType；
`HmsScanError` 显示真实 code/message；普通 Error 显示通用错误。

- [ ] **Step 3: 写 native config RED**

在 integration scripts 先断言：

```js
assert.match(infoPlist, /<key>NSCameraUsageDescription<\/key>\s*<string>[^<]+<\/string>/);
assert.match(infoPlist, /<key>NSPhotoLibraryUsageDescription<\/key>\s*<string>[^<]+<\/string>/);
assert.equal(infoPlist.includes('NSLocationWhenInUseUsageDescription'), false);
assert.equal(androidManifest.includes('android.permission.ACCESS_FINE_LOCATION'), false);
assert.ok(androidSettings.includes('https://developer.huawei.com/repo/'));
```

同时检查 minSdk 24、newArch enabled、physical-device build script 和 ScanKit lock。

- [ ] **Step 4: 运行 RED**

Run:

```sh
yarn test example/src/__tests__/HeadlessShowcaseScreen.test.tsx example/src/__tests__/DecodeImageShowcaseScreen.test.tsx --runInBand
yarn verify:android-integration
yarn verify:ios-integration --require-lock
```

Expected: UI 模块不存在，iOS permission contract 因缺 camera/photo 且有空 location 而失败。

- [ ] **Step 5: 实现两个页面与配置**

Headless 只在 `shouldMountView` true 时渲染绝对填充的 `<HmsScanView>`；取景框/控制条使用
Design token + RN layout。Decode 使用 `Empty/Spinner/Card/Tag/Button`，只把 picker URI
交给 controller。Info.plist 加中文 camera/photo 文案并删 location；Android 不加新权限。

- [ ] **Step 6: 运行 GREEN 并提交**

Run:

```sh
yarn test example/src/__tests__ --runInBand
yarn verify:android-integration
yarn verify:ios-integration --require-lock
yarn typecheck
yarn lint
git diff --check
```

Expected: 全部 exit 0。

```sh
git commit -m "feat: complete hms scan showcase"
```

---

### Task 7: 更新 README、AGENTS、website 验证与完整门禁

**Files:**
- Modify: `README.md`
- Replace: `example/README.md`
- Modify: `AGENTS.md`
- Modify: `.github/workflows/ci.yml`
- Modify: `turbo.json`

**Interfaces:**
- Consumes: Tasks 1–6 的最终命令、目录、版本、三能力与平台边界。
- Produces: 可复制文档、准确开发基线、CI/test/website/native 完整验证入口。

- [ ] **Step 1: 更新 README**

根 README 增加三能力 example 入口。example README 按以下顺序：

```text
安装 → Android Huawei Maven / iOS permissions → Metro
→ Android 非华为真机 / iPhone physical device → Scanner
→ HmsScanView → decodeImage → 空数组/错误语义 → 复制边界 → 测试矩阵
```

明确 image-picker 和本地商品表属于 example，不是 library；iOS simulator 不支持；
`decodeImage` 不下载 URL；非华为 Android 无需 HMS Core/agconnect/API Key。

- [ ] **Step 2: 更新 AGENTS 与 CI**

AGENTS 将当前开发验证事实改为 RN 0.86.2/Design 0.20/RNGH 3，但保留 public peers 原值；
常用命令加入 example tests。CI/ turbo 保证 lockfile 变化继续触发 website，并显式运行
覆盖 example 的 root Jest/lint/typecheck 与两个 integration scripts。

- [ ] **Step 3: 运行完整 JS/website 门禁**

Run:

```sh
yarn install --immutable
yarn typecheck
yarn lint
yarn test --runInBand
yarn prepare
node website/scripts/build-llms.test.js
yarn workspace @unif/react-native-hms-scan-website typecheck
yarn workspace @unif/react-native-hms-scan-website build
```

Expected: 全部 exit 0，Jest 0 failed，website 不因 lockfile/多版本 workspace 破坏。

- [ ] **Step 4: 运行 native build**

Run:

```sh
yarn example build:android
bundle exec pod install --project-directory=example/ios
yarn example build:ios
```

Expected: Android arm64 与 generic physical iphoneos build exit 0。不得改为 iOS simulator。
若本机缺 SDK/Xcode/vendor network，保存原始失败证据，不能移除对应 CI gate。

- [ ] **Step 5: 最终规格核对**

逐条核对设计规格验收：三入口、Scanner 全 props、headless 权限/torch/result/error、
decode success/empty/HmsScanError、Design/token/a11y、RN0.86.2 运行图、public peers、
iOS permissions、Huawei Maven、两份 README 与 website。

Run:

```sh
git diff --check
git status --short
git diff --stat
```

- [ ] **Step 6: 提交**

```sh
git commit -m "docs: document hms scan showcase"
```
