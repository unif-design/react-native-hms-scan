# `src` 审核问题修复设计

日期：2026-08-02
状态：已确认，待书面规格复核

## 背景

对 `src/` 的完整审核确认了九项问题，集中在 `<Scanner>` 的运行时依赖、权限与错误
恢复、相机和相册并发、自动确认、手电状态，以及公开类型和源码 JSDoc：

1. `<Scanner>` 无条件挂载未使用的 `ToastHost`。`ToastHost` 会立即调用
   `useSafeAreaInsets`，没有 `SafeAreaProvider` 的最小宿主会在首屏渲染时抛错；仓库
   example 正是这种接入方式。
2. 拒权页只打开系统设置，不在 App 回到前台时重新查询权限，用户授权后仍停留在
   `denied`。
3. 相册路径在等待 `pickImage()` 返回后才占用 `handlingRef`，等待期间相机回调或重复
   点击可启动第二条处理链，造成重复确认或商品与 `ScanResult` 错配。
4. `<Scanner>` 只处理原生当前不会产生的 `E_NO_CAMERA_PERMISSION`，实际 Android
   `E_CAMERA_INIT` 被静默丢弃；权限 helper reject 还会 fail-open 进入相机态。
5. `autoConfirm` 与可选 `onConfirm` 可以组成合法 props；没有回调时仍进入无操作入口的
   `done`。
6. 成品页用请求值显示“已开灯”，没有消费原生 `onTorchStatus.on`，iOS best-effort
   开启失败时会显示错误状态。
7. `formats` props/options 要求可变数组，无法直接接受导出的
   `ALL_BARCODE_FORMATS` 或常见的 `as const` 数组。
8. `decodeImage` 与 TurboModule 的源码 JSDoc 泛化列出 `ph://`，与两端实际输入边界
   冲突。
9. `{ barcode: result.value, ...resolved }` 允许 `resolved.barcode === undefined`
   覆盖默认条码。

现有 Jest 通过 `jest.setup.ts` 把 `ToastHost`、原生 view 和权限边界替换成轻量桩，
因此没有覆盖上述跨组件依赖和状态机竞态。

## 目标

- 保持现有三种入口 `<Scanner>`、`<HmsScanView>`、`decodeImage` 的职责分层。
- 让 `<Scanner>` 按文档所示可直接作为路由整屏渲染，不额外要求
  `SafeAreaProvider`。
- 所有会启动异步识别的入口共享“一次只处理一个结果”的互斥语义。
- 权限与相机初始化失败必须 fail-closed，并提供可见错误态、重试和宿主观测能力。
- 不破坏正常确认、`autoConfirm` 成功终态、图片无结果返回 `[]`、iOS
  `E_NO_RESULT` 软错误等既有契约。
- 修正公开类型与 IDE JSDoc，并同步仓库文档和生成的 `llms.txt`。

## 非目标

- 不修改 Android/iOS Scan Kit 的原生实现、错误码或权限映射。
- 不改变 `decodeImage` 的 URI 加载能力，也不新增远程 URL 下载。
- 不引入新的 UI/状态管理依赖。
- 不承诺 iOS Simulator；继续以仓库当前 device-only 边界为准。
- 不修改仓库外的全局 Skill 安装目录。

## 方案比较

### 方案 A：完整错误态、重试与宿主回调（采用）

新增 `<Scanner>` 内部 `error` phase、专用错误页和可选 `onScanError`，权限 helper
reject 与 fatal view error 都进入该状态。重试先重新检查权限，再重新挂载相机。

优点：

- 错误语义准确，不把相机初始化失败伪装成“未识别到条码”。
- 用户有明确恢复入口，宿主也能记录错误。
- 同一套重试流程同时覆盖权限集成错误和相机初始化错误。

代价：

- 新增一个向后兼容的可选公共 prop 和一个共享错误对象类型。
- 需要同步 Scanner API、状态机和权限文档。

### 方案 B：只提供内部错误页（不采用）

可以修复卡死与重试，但宿主无法记录 `E_CAMERA_INIT`、`E_NO_ACTIVITY` 等集成问题，
排障能力不足。

### 方案 C：复用现有 `ResultFail`（不采用）

改动最小，但“未识别到条码”的文案与相机启动失败不符，且现有重扫只恢复 phase，
不能保证失败的原生 view 被重新挂载。

## 详细设计

### 1. 移除 `<Scanner>` 内置 `ToastHost`

`Scanner` 保留内部 `ThemeProvider`，删除 `ToastHost` import 和渲染节点。当前实现已经
不调用 `toast`，继续挂载 host 没有功能收益，反而：

- 强制宿主必须提供 `SafeAreaProvider`；
- 宿主已有全局 `ToastHost` 时，会产生第二个全局订阅者并可能重复显示 toast。

文档统一改成“自带 `ThemeProvider`、权限流和状态机”。宿主仍可按
`@unif/react-native-design` 的正常用法在 App 根部挂载自己的 `ToastHost`。

### 2. 统一扫码错误对象和宿主回调

在 `src/types.ts` 新增：

```ts
export interface ScanError {
  code: string;
  message: string;
}
```

`HmsScanViewProps.onScanError` 改为使用 `ScanError`，`ScannerProps` 新增同签名的可选
`onScanError`，`src/index.tsx` 导出该类型。把类型放在 `types.ts` 可让正式入口与
`mock` 的 `export * from './types'` 自动保持一致。

`<Scanner>` 的 view error 分流：

- `E_NO_CAMERA_PERMISSION`：进入 `denied`。
- `E_NO_RESULT`：作为 iOS 单次无有效结果的软错误，只通知宿主，保持扫描。
- `E_CAMERA_INIT` 与未知错误：进入 `error`。

内部状态转换先发生，再调用宿主 `onScanError`，避免宿主回调异常阻止内部 fail-closed。

### 3. 权限流、设置返回与 stale async 防护

权限检查抽成稳定的异步函数，并使用递增 request id 判断当前结果是否仍有效：

1. 每次检查先取得新的 id。
2. `getCameraPermissionStatus` 返回后，先验证组件仍挂载且 id 仍是最新。
3. 初次挂载和错误重试允许对 `undetermined` / `denied` 调
   `requestCameraPermission`；从系统设置返回只查询，不再次弹权限框。
4. 每个 await 后都再次验证 id，过期流程不得更新 phase 或发起后续请求。

这同时修复 React StrictMode 重跑 effect 时旧异步流程可能继续请求权限的问题。

拒权页“去设置开启”会先设置 `waitingForSettingsRef`，再调用
`Linking.openSettings()`。`AppState` 监听到下一次 `active` 且该标记为真时，清除标记
并重新查询权限：

- 已授权：`denied → scan`，相机重新挂载。
- 仍未授权：保持 `denied`。
- helper reject：进入 `error`。

权限 helper reject 不再进入 `scan`。错误会收敛为 `ScanError`，缺少原生 code/message
时使用 `E_UNKNOWN` 和稳定的 fallback message，然后进入错误页并通知宿主。

### 4. 相机错误页与重试

增加 `ScanErrorOverlay`，使用现有 design `Empty` 与 `Button`：

- 标题：“相机启动失败”。
- 说明：“无法启动扫码相机，请确认权限与设备状态后重试。”
- 主操作：“重试”。
- 传入 `onClose` 时同时显示“取消”。

`error` phase 不渲染 `<HmsScanView>`，确保失败的 Fabric view 被卸载。重试进入
`init` 并重新运行权限检查；权限通过后进入 `scan`，因此会创建新的原生 view，而不是
只对失败实例切换 `paused`。

### 5. 相册与相机共享互斥锁

相册按钮事件在调用 `pickImage()` 前同步执行：

```text
检查 handlingRef
  ↓
handlingRef = true
  ↓
phase = detecting（相机立即暂停）
  ↓
等待 picker
```

这样相机回调和第二次相册点击都会看到锁并退出。选图耗时不计入识别耗时：
`detectStartRef` 在取得有效 URI、调用 `decodeImage` 前设置。

- picker 取消返回 `null`：调用 `reset()`，释放锁并恢复 `scan`。
- picker 或 decode 抛错：进入现有 `fail`，等待用户重扫。
- 组件卸载：不再写状态。

相机回调继续在写 phase 前同步占锁，两种入口遵循相同的一次处理语义。

### 6. `autoConfirm` 缺少回调时安全降级

只有 `autoConfirm === true && onConfirm` 存在时才执行自动确认并进入 `done`。
`autoConfirm` 为真但没有 `onConfirm` 时，按普通成功路径设置 `product` 并显示确认卡，
不会进入不可交互终态。

不把 `ScannerProps` 改成判别联合，避免让当前使用动态 boolean 的消费者产生
TypeScript breaking change；运行时防护同时覆盖 JavaScript 消费者。

### 7. 手电状态以原生结果为准

`<Scanner>` 给 `<HmsScanView>` 传入 `onTorchStatus`，收到事件后用 `status.on`
校准本地 `torch`。用户点击后的请求值可以即时更新 UI，但 iOS/Android 回报实际未点亮
时会恢复“手电筒”状态，不再持续显示“已开灯”。

当 `showTorch` 从真变为假时主动把 `torch` 设为 `false`，避免按钮隐藏后灯仍保持点亮。
`available` 的双端不同语义保持不变，不用于 Scanner 按钮显隐。

### 8. 公开 readonly 类型

以下类型统一改为 `readonly BarcodeFormat[]`：

- `DecodeImageOptions.formats`
- `HmsScanViewProps.formats`
- `ScannerProps.formats`

运行时只读取并转 CSV，不需要可变数组。该变更向后兼容普通数组，同时允许
`ALL_BARCODE_FORMATS` 和 `as const` 数组直接传入。

### 9. 商品默认条码

商品合并改为：

```ts
const p: ScanProduct = {
  ...resolved,
  barcode: resolved.barcode ?? result.value,
};
```

缺失或显式 `undefined`/`null` 时回退扫描值；空字符串仍被视为宿主显式值，不擅自改写。
虽然 TypeScript 类型没有声明 `null`，运行时使用 `??` 可保持防御性。

### 10. URI JSDoc

`src/decodeImage.ts` 与 `src/NativeHmsScan.ts` 改为明确的平台输入：

- iOS：`file://`、绝对路径、`data:`。
- Android：`file://`、绝对路径、`content://`、`android.resource://`。
- `ph://`、`assets-library://`、远程 URL 均不支持。

这里只修正文档，不在 JS 层预判平台或提前拒绝，原生仍是最终加载边界并保持
`E_IMAGE_LOAD_FAILED` 语义。

## 测试设计

所有行为修复先写失败测试，再写实现。

### Scanner 组件测试

扩展 `src/__tests__/Scanner.test.tsx` 的原生桩，使其捕获：

- `paused`
- `torch`
- `onTorchStatus`
- `onScanError`

新增回归：

1. `Scanner` 不再渲染内部 `ToastHost`。Jest design mock 为 `ToastHost` 输出可查询
   testID，修复前测试失败。
2. 初始权限 helper reject 时显示“相机启动失败”，且不挂载相机取景。
3. `E_CAMERA_INIT` 进入错误页、调用宿主 `onScanError`；点重试后重新检查权限并重新
   挂载相机。
4. `E_NO_RESULT` 只通知宿主，不离开取景态。
5. 被拒后点击设置，模拟 `AppState → active` 与权限变为 `granted`，恢复取景。
6. 相册 picker Promise pending 时相机处于 paused；此时触发相机结果不会调用
   `resolveProduct`。picker 取消后恢复取景。
7. 相册路径与相机路径不能触发两次 `autoConfirm`。
8. `autoConfirm` 未传 `onConfirm` 时显示普通确认卡。
9. 原生回报 `{ on: false }` 后撤销“已开灯”展示。
10. `resolveProduct` 返回 `barcode: undefined` 时，确认回调收到扫描值。

### 类型与纯逻辑测试

在类型检查覆盖的测试文件中声明 readonly formats，并分别赋给：

- `DecodeImageOptions`
- `HmsScanViewProps`
- `ScannerProps`

修复前 `yarn typecheck` 必须失败，修复后通过。现有 `formatsToCsv`、解析脏数据和 mock
测试保持不变。

### 完整门禁

实现完成后执行：

```sh
yarn typecheck
yarn lint
NPM_CONFIG_CACHE=/private/tmp/react-native-hms-scan-npm-cache yarn test
yarn prepare
yarn workspace @unif/react-native-hms-scan-website build:llms
```

`yarn test` 保留 iOS npm integration 校验；临时 npm cache 只规避当前用户级
`~/.npm` 的既有权限问题，不改变仓库配置。

## 文档与生成物联动

同步核对并按实际命中更新：

- `AGENTS.md`
- `README.md`
- `website/docs/getting-started/quick-start.md`
- `website/docs/api/scanner.md`
- `website/docs/api/hms-scan-view.md`
- `website/docs/api/functions.md`
- `website/docs/api/types.md`
- `website/docs/guides/scanner.md`
- `website/docs/guides/permissions.md`
- `website/docs/platform-differences.md`
- website 生成的 `llms.txt` / `llms-full.txt`

统一事实：

- `<Scanner>` 自带 `ThemeProvider`、权限流与状态机，不再自带 `ToastHost`。
- 状态机包含 `error`，权限 helper reject 与 fatal camera error 都 fail-closed。
- 设置授权返回后会自动重新查询权限。
- `ScannerProps.onScanError` 是普通 `{ code, message }` 对象回调，不是
  `HmsScanError`。
- `autoConfirm` 缺少 `onConfirm` 时回退确认卡。
- 手电标签最终服从真实 `onTorchStatus.on`。
- formats 接受 readonly 数组。

仓库外全局安装的 `hms-scan` Skill 不在本仓写入范围；交付时单独报告其中
`ThemeProvider/ToastHost` 与权限 fail-open 描述需要在 Skill 源仓同步。

## 验收标准

- 仓库 example 在未显式挂载 `SafeAreaProvider` 时可渲染 `<Scanner>`，不再由内部
  `ToastHost` 抛错。
- 设置中授予相机权限并回到 App 后，当前 Scanner 实例恢复取景，无需退出重进。
- 相册 picker pending 时相机暂停，任何相机回调都不能与图片结果并发 finalize。
- 权限 helper reject、Android `E_CAMERA_INIT` 均展示错误页；重试会重新检查权限并
  创建新的相机 view。
- iOS `E_NO_RESULT` 不打断连续扫描，但会通知宿主。
- `<Scanner autoConfirm>` 未传 `onConfirm` 时显示确认卡，不进入 `done`。
- 手电开启失败后 UI 不显示“已开灯”；隐藏手电按钮会请求关灯。
- readonly formats 可用于所有三处公开输入。
- `barcode: undefined` 不再覆盖扫描值。
- 源码 JSDoc 不再宣称支持 `ph://`。
- 新增回归测试与原有 23 个测试全部通过，typecheck/lint/prepare/llms 门禁通过。
- `git diff` 只包含本次修复、测试、文档与生成物。

## 风险与控制

- AppState 会在多种系统跳转后变为 `active`；通过 `waitingForSettingsRef` 限定只有本
  组件主动打开设置后才触发权限恢复，避免无关前后台切换重复查询。
- 相册打开前进入 `detecting` 会让被系统 picker 覆盖的底层页面短暂显示识别中，这是
  为立即暂停相机付出的可接受代价；取消后恢复 `scan`。
- 新增 `onScanError` 为纯可选 prop，不影响既有消费者。错误对象沿用 headless view
  的字符串 code 设计，以容纳 `E_NO_ACTIVITY` 等不属于 `HmsScanErrorCode` 的原生
  integration code。
- 对外 Skill 的同步需要在其源仓单独完成，不能在本仓任务中直接修改全局安装副本。
