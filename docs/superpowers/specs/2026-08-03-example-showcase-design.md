# HMS Scan Example 三能力展厅设计

日期：2026-08-03
状态：已批准，待实施

## 现状问题

当前 `example/src/App.tsx` 只有一个硬编码样式的 `<Scanner>` 入口，无法展示
`<HmsScanView>` 与 `decodeImage`，也不能让消费者比较三种能力的职责边界。示例还存在：

- 直接使用 React Native `Pressable`、硬编码颜色和零散 `StyleSheet`，没有根级
  Design Provider，也不支持完整的 light/dark token 语义。
- `@unif/react-native-design` 的根开发依赖与 example 依赖都停留在 `0.8.1`，没有验证
  Design `0.20.0` 的真实运行组合。
- `example/README.md` 仍是 React Native 脚手架说明，没有三能力、复制边界或平台配置。
- iOS `Info.plist` 缺少相机与相册用途说明，却保留空的定位用途说明。
- Android 已配置 Huawei Maven，但示例与自动化测试没有把该配置锁成 contract。

## 目标

把 example 建成独立、产品化且可复制的三能力展厅：

1. 首页并列呈现 `<Scanner>`、`<HmsScanView>`、`decodeImage` 三个入口。
2. 每个入口都是边界清晰的 feature 模块，消费者可以复制一个模块及其明确依赖。
3. 所有产品 UI 统一复用 `@unif/react-native-design` 组件、token、主题和 a11y 约定。
4. example 自己处理导航、图片选择和演示数据，不把这些职责推入 hms-scan。
5. 同时证明 Android 非华为设备可用、iOS 仅支持真机，以及图片空结果不是错误。

## 范围

- 重构 `example/src/` 的 App 根、typed navigation、首页和三个 feature 模块。
- 为 example 显式安装图片选择器，补齐 Design `0.20.0` 的兼容运行依赖。
- 将根开发/测试环境与 example 原生宿主从 RN `0.85.3` 迁到 RN `0.86.2`，同步官方
  template 必需变更、AGENTS 当前事实、根 README 与 `example/README.md`。
- 增加 example 的纯状态、组件 wiring、配置 contract 与 integration script 覆盖。
- 保持现有 library 源码、公开 API 和错误语义作为示例的唯一事实来源。

## 非范围

- 不引入 React Navigation、全局状态框架或跨仓共享 UI/业务包。
- 不修改 `<Scanner>`、`<HmsScanView>`、`decodeImage`、权限 helper 的公共 API。
- 不修改 hms-scan 的任何公开 `peerDependencies` 范围。
- 不给 `decodeImage` 增加远程下载，也不内置图片选择器。
- 不接真实商品服务、埋点、账号、云端配置或 AppGallery Connect。
- 不支持 iOS Simulator，不伪造 framework slice，不增加宿主 Podfile 绕过。
- 公共契约不变，因此不改 website 内容、`llms.txt` 或 hms-scan Skill；lockfile 变化后
  仍须验证现有 website workspace。

## 架构与模块拆分

example 使用本地、typed、单层 stack navigation，不引入路由库。路由是封闭联合：

```ts
type ExampleRoute =
  | { name: 'home' }
  | { name: 'scanner' }
  | { name: 'headless' }
  | { name: 'decode-image' };
```

纯 reducer 只提供 `navigate(route)` 与 `back()`：首页是栈底；Android hardware back 在
子页 pop，首页交还系统。各 screen 只接收 typed `onBack`/完成回调，不直接读取导航实现。

目标目录按职责拆分为 `app/AppProviders.tsx`、`navigation/exampleNavigation.ts`、
`screens/HomeScreen.tsx`，以及 `showcases/scanner/`、`showcases/headless/`、
`showcases/decode-image/` 三个 feature 目录。每个 feature 内放自己的 screen、纯状态和
fixture；`shared/` 只放 `FormatSelector`、`ShowcaseScaffold`、`pickLocalImage`；
对应测试统一放在 `example/src/__tests__/`。
三个 feature 之间不互相 import；纯状态与配置常量不依赖原生模块，便于单测和复制。

## 根 Provider 与 Design 约束

App 根固定为
`GestureHandlerRootView → SafeAreaProvider → ThemeProvider → ExampleRouter + ToastHost`。

- `react-native-gesture-handler` 必须在入口最先初始化，根容器 `flex: 1`。
- `ToastHost` 只挂一次，用于完成与错误反馈；未使用 `confirm()`，不挂 `ConfirmHost`。
- `<Scanner>` 自带的 `ThemeProvider` 与外层 Provider 兼容；安全区通过 `topInset`、
  `bottomInset` 显式传入。
- Design 组件和类型只从包根 barrel 导入。已有 `Button`、`IconButton`、`Card`、
  `EntryCard`、`Segmented`、`Switch`、`Tag`、`Empty`、`Spinner` 时不得手搓替代品。
- React Native 原语只承担布局、滚动、相机叠层和平台生命周期；交互优先用 Design 组件。
- 颜色只用 `useColors()`；样式用模块顶层 `makeStyles` +
  `useThemedStyles`，禁止新增内联 hex/rgba 与手写阴影。
- `EntryCard` 复用其内建 button role/组合 label；`Switch` 和 `IconButton` 显式提供
  非空 `accessibilityLabel`；选中、禁用状态使用组件已有的 checked/selected state。

## 首页

首页是能力选择页，不直接启动权限请求。顶部说明“同一个 SDK 的三种使用层级”，下面用
三个 `EntryCard` 展示：

1. **Scanner 成品页**：内置权限、状态机、取景框与确认卡。
2. **HmsScanView 自定义页**：只提供预览和事件，宿主自管 UI、权限与状态。
3. **decodeImage 图片识别**：选择本地图片并离线解码。

页面同时以 `Tag` 明示“新架构”“Android ≥ 24”“iOS 真机”，每张入口卡有简短适用场景
的可见 `sub` 文案，不提前申请相机或相册权限。

## Scanner 展厅

Scanner feature 先显示配置面板，再进入全屏 `<Scanner>`。它必须接入并可观察：

- `formats`：提供“全部”“二维码”“商品条码”三个 typed preset；“全部”传
  `undefined`，商品条码传 readonly `EAN_8/EAN_13/UPC_A/UPC_E/CODE_128`。
- `pickImage`：调用共享 `pickLocalImage()`；取消返回 `null`，成功返回本地 URI。
- `resolveProduct`：异步查询 example 内固定商品表；命中返回完整 `ScanProduct`，未命中
  返回 `null`，从而真实展示成功卡与未识别分支。README 给出可复现的演示条码。
- `autoConfirm`：用 Design `Switch` 配置并始终提供 `onConfirm`。关闭时用户点结果卡后
  回调，开启时解析成功后直接回调；两条路径都先同步保存商品与 `ScanResult`，再卸载
  Scanner 回到配置面板。回调实现为同步、不得 throw 或返回待处理 Promise；只有回调
  正常返回，Scanner 的自动确认路径才会进入 `done`，同步 throw 会被其内部收敛为
  可重扫的 `fail`。
- `onScanError`：记录最近 `{code,message}` 并通过 toast/状态卡展示；不得把普通
  `ScanError` 当成 `HmsScanError`。`E_NO_RESULT` 仍是不中断取景的 soft error。

关闭 Scanner 返回配置面板，再次进入创建新实例；示例不复制或绕过其内部状态保护。

## HmsScanView 展厅

headless feature 自己维护以下显式状态：

- 权限：`checking/requesting/granted/denied/blocked/error`。只调用公开
  `getCameraPermissionStatus()` 与 `requestCameraPermission()`：先查询，用户操作后才
  请求；blocked 提供 `Linking.openSettings()`，App 回到 active 后重新查询。Android
  查询未授权统一为 denied，blocked 只能由请求后结果判断；iOS 只返回
  granted/undetermined/blocked，不返回 denied。helper reject 进入 error，未 granted
  时不挂相机 view；Android 没有当前 `PermissionAwareActivity` 时
  `requestCameraPermission()` 会 reject `E_NO_ACTIVITY`，不能伪造成某个 status。
- 控制：`paused`、`continuous`、`torchRequested`，均使用受控 Design 控件。
- 手电：`torch` 传请求值；`onTorchStatus` 保存 `{available,on}`，UI 分开展示请求值与
  真实点亮值。Android 的 `available` 是暗光提示，iOS 是硬件能力，不能混写或控制显隐。
- 结果：`onScanResult` 展示 value、format、contentType；按 `format:value` 去重并保留
  最近结果。非连续模式命中后进入 paused，用户明确点击“继续扫描”才恢复。
- 错误：`onScanError` 保存普通 `ScanError`。`E_NO_RESULT` 仅提示；兼容性的
  `E_NO_CAMERA_PERMISSION` 触发权限复查；其他 view error 暂停预览并提供重试。当前
  Android view 主要产生 `E_CAMERA_INIT`，iOS view 主要产生 `E_NO_RESULT`，不得把它们
  或权限 helper reject 伪装成“图片无结果”。

取景框、提示、控制条和结果卡由 example 用 Design token 叠加；`<HmsScanView>` 仍只
负责相机预览和事件。

## decodeImage 展厅

`react-native-image-picker` 是 `example/package.json` 的显式 runtime dependency，
不加入 hms-scan 的 peer 或 library runtime。共享 adapter 使用
`launchImageLibrary({mediaType:'photo', selectionLimit:1})`，不取 base64、不下载远程
URL；取消或缺少 asset/uri 返回 `null`。

页面状态固定为 `idle/picking/decoding/empty/success/error`，重复点击在 pending 期间
禁用，迟到结果不得覆盖更新的一次选择。取得本地 URI 后才调用 `decodeImage`：

- 返回一个或多个结果：展示 value、format、contentType。
- 返回 `[]`：进入正常 Empty 态“图片中未识别到条码”，不得 toast error 或 throw。
- reject：以 `error instanceof HmsScanError` 识别真实扫码错误并展示 code/message。
  该判断可用，因为公开类显式修复了 `Error` prototype，官方 mock 也重新导出同一个类；
  `decodeImage` 会把已知 `E_NO_READ_PERMISSION/E_IMAGE_LOAD_FAILED/E_DECODE_FAILED`
  和未知 native reject 都包装成 `HmsScanError`（未知 code 收敛为 `E_UNKNOWN`）。只有
  picker/页面自身的非 HMS 异常使用独立通用文案。

## 依赖与版本策略

根 `devDependencies` 与 example dependency 的 Design 从 `0.8.1` 同步到精确
`0.20.0`。Design `0.20.0` 的实际支持基线是 React `19.2.3`、RN `0.86.2`、
RNGH `^3.1.0`、Reanimated `~4.5.3`、Worklets `^0.11.3`、Carousel `^5.0.0`、
Safe Area `^5.7.0`、SVG `^15.15.5`、Blur `^4.6.2`。根开发/测试依赖与 example
runtime 必须使用这一组，`@react-native/*` Babel/Jest/Metro/TypeScript presets 对齐
`0.86.2`，CLI 对齐已验证的 `20.1.x`。`react-native-image-picker` 选择明确支持
RN `0.86.2` 的稳定版，并由 example manifest semver 与 `yarn.lock` 精确 locator 固定。

RN 升级范围只包含根 library 开发/测试图和 example native app，不修改 hms-scan 的
公开 React/RN peer ranges，也不顺带迁移 website 自己的 RN `0.85.3`/Design `0.8.1`
运行图。example 的 Android Gradle/settings/application/activity 与 iOS
Podfile/AppDelegate/Xcode project 必须逐项对照官方 RN `0.86.2` template 更新；保留
Huawei Maven、minSdk 24、新架构、ScanKit 真机 Pod 和现有 bundle id 等领域配置，禁止
直接用模板覆盖。Babel 继续把 `react-native-worklets/plugin` 放在最后，Metro 继续使用
与 RN `0.86.2` 对齐的 `@react-native/metro-config`。

安装只用 Yarn 4，正常更新 manifest 与 lockfile，再执行 immutable 复验。不得使用
`--force`、`--legacy-peer-deps`、全局 override 或全局忽略 peer。Carousel `5.0.0`
对 RNGH `<3` 的发布 metadata 与 Design 的 RNGH 3 范围冲突是已知窄例外；仅接受该精确
组合的 warning 或 scoped allowlist，其他 peer warning 必须解决。hms-scan 的公开
peer ranges 原样保留。`AGENTS.md` 与根 README 中“RN 0.85 开发验证”和旧 Design/RNGH/
Carousel 基线必须改成实施后的 RN `0.86.2`/Design `0.20.0` 事实；历史 plans 不回写。

## 原生宿主配置

- iOS `Info.plist` 增加有实际中文文案的 `NSCameraUsageDescription` 与
  `NSPhotoLibraryUsageDescription`；删除无关的 `NSLocationWhenInUseUsageDescription`。
  不增加写相册权限，因为 example 只读取用户选择的图片。
- 图片选择器与 Design 原生 peers 通过 autolinking/CocoaPods 正常安装；运行
  `pod install` 后的 Pod lock 必须精确包含 `ScanKitFrameWork 1.1.2.305`。
- Android 保留 `minSdkVersion 24`、新架构和
  `https://developer.huawei.com/repo/`。不增加 agconnect、API Key 或定位权限。
- iOS build/run 命令继续明确选择 physical device；generic iphoneos 可做无签名构建，
  Simulator 不属于构建或 smoke 目标。

## README

根 README 同步 RN `0.86.2` 开发验证事实，并增加“三能力 example”入口、根目录 Yarn
命令和平台边界。`example/README.md` 替换脚手架文本，包含：三页用途与复制目录、依赖
安装、Metro/Android/iOS 真机命令、Huawei Maven、iOS 权限、示例条码、图片 URI/空数组
语义，以及非华为 Android 无需 HMS Core/agconnect。文档不得把 example 的 picker 或
本地商品表描述成 library 能力。

## 测试与验证

example 的消费者 smoke 测试默认通过
`jest.mock('@unif/react-native-hms-scan', () => require('@unif/react-native-hms-scan/mock'))`
整包替换为官方 mock；该 mock 的组件渲染 `null`，`decodeImage` 默认 resolve `[]`，
权限默认 granted，纯类型/常量/`HmsScanError` 保留真实实现。prop wiring 由 TypeScript、
配置常量和真机 smoke 验证，不对渲染 `null` 的 mock 断言内部 UI。

纯 reducer/函数测试覆盖 route stack、三个页面状态、format preset、picker
cancel/local URI、`[]` 空态、`HmsScanError` instanceof/error code、headless 权限与
paused/continuous/torch/result/error 转换。测试只断言外部行为，不复制原生实现。

当前根 `tsconfig.json` 已包含 example，根 Jest 也未忽略 example，保持这两条发现路径；
当前 ESLint 却显式忽略 `example/**`，实施时必须移除该宽 ignore 或增加等价的 workspace
lint 并让根 `yarn lint` 调用它。若渲染 example screen，扩展现有 Design Jest mock 覆盖
本规格使用的组件；不得用跳过 example 测试来维持绿色。

现有 `verify:ios-integration` 与 `verify:android-integration` scripts 扩展为 contract：
iOS 断言相机/相册用途说明存在、定位用途说明不存在、真机脚本和 ScanKit lock；Android
断言 Huawei Maven、minSdk 24、新架构及无无关定位权限；依赖 contract 断言 Design
0.20、image-picker direct dependency、兼容 peer 解析和 hms-scan 公开 peer ranges
未变。根 `yarn test` 必须继续先跑这两个 scripts，再跑包含 example 测试的 Jest。

`example/package.json` 已存在 `build:android` 与 `build:ios`，根 `example` script 也会
转发 workspace 命令；复用这两个 script 和现有 Turbo/CI task，不 invent 不存在的
native build alias。lockfile 变化会触发 website CI，因此同时验证现有 website。

完整门禁依次为：

```sh
yarn install --immutable
yarn typecheck
yarn lint
yarn test --runInBand
yarn prepare
node website/scripts/build-llms.test.js
yarn workspace @unif/react-native-hms-scan-website typecheck
yarn workspace @unif/react-native-hms-scan-website build
yarn example build:android
(cd example && bundle install && bundle exec pod install --project-directory=ios)
yarn example build:ios
```

原生构建之外还执行真机矩阵：

| 平台 | 必验能力 |
| --- | --- |
| 非华为 Android 真机 | Scanner 相机/相册、headless 权限与手电、decodeImage 成功/空态 |
| iPhone 真机 | Scanner 相机/相册、headless 权限与手电回写、decodeImage 成功/空态 |

## 验收标准

- 首页可进入三个独立展厅，返回行为在 iOS、Android 与 hardware back 下正确。
- 所有 UI 使用 Design 0.20 的组件/token/provider，light/dark、safe area 与 a11y 可用。
- Scanner 页面实际演示 `formats/pickImage/resolveProduct/autoConfirm/onScanError`。
- headless 页面只在授权后挂相机，并完整演示 paused、continuous、torch、
  `onTorchStatus`、result 与 error。
- decodeImage 只接收 picker 返回的本地 URI；`[]` 显示正常空态，`HmsScanError` 显示
  code/message。
- example 与根开发依赖形成 Design 0.20 的兼容安装图；immutable install 无未解释的
  peer 漂移，未使用 force；hms-scan 公开 API 与 peer ranges 无变化。
- RN `0.86.2` template 迁移覆盖 example 双端 native shell，AGENTS/README 记录新验证
  基线；website 保持自己的依赖图且现有 typecheck/build 仍通过。
- iOS 权限文案完整且无定位权限；Android Huawei Maven、新架构与 minSdk 24 保持有效。
- 两份 README 能独立指导安装、运行、复制和理解平台边界。
- 官方 mock、纯状态、配置 contract、integration scripts、覆盖 example 的 lint/
  typecheck/Jest、prepare、website、Android/iOS device build 全部通过。
- 非华为 Android 真机与 iPhone 真机完成三能力 smoke，iOS Simulator 不计入成功标准。
