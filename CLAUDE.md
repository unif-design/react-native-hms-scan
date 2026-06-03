# CLAUDE.md

<!-- Cross-agent rules live in AGENTS.md (Cursor / Codex / Copilot read it directly). Claude Code does not read AGENTS.md, so CLAUDE.md @import-s it below to keep a single source of truth. Add Claude-specific instructions under this comment. -->
@AGENTS.md

## 仓库定位

`@unif/react-native-hms-scan` —— 华为 **HMS 统一扫码(Scan Kit)** 的 React Native 封装。提供三种用法:成品「扫一扫」页 `<Scanner>`、headless 相机组件 `<HmsScanView>`、从本地图片识别 `decodeImage`。目标运行时:**RN 0.85 新架构**(Fabric + TurboModule)、React 19、TypeScript 6。**仅支持新架构**。

Android 用 **Scan SDK-Plus**(`com.huawei.hms:scanplus`,**内置引擎,非华为机也能用,不依赖设备装 HMS Core APK**);iOS 用 **ScanKitFrameWork**。两端**都不需要 AppGallery Connect / agconnect / API Key**。

yarn workspaces 单仓库:库本体在根目录,`example/` 是宿主 RN app,`website/` 是 Docusaurus 文档站。

## 常用命令

除非另注,命令都在仓库根目录执行。

```sh
yarn                  # 安装(yarn 4.11,node v24.13.0,见 .nvmrc)
yarn typecheck        # tsc(strict)
yarn lint             # eslint **/*.{js,ts,tsx}
yarn test             # jest(跑 src/__tests__/ 下的纯逻辑测试)
yarn test src/__tests__/format.test.ts    # 跑单文件
yarn test -t "pattern"                    # 按测试名过滤
yarn prepare          # react-native-builder-bob → lib/module(ESM)+ lib/typescript(.d.ts)
yarn clean            # 清 lib/ + example 原生构建产物

# example 应用(扫码功能需真机,见下)
yarn example start    # metro
yarn example ios      # 构建并跑 iOS
yarn example android  # 构建并跑 Android
```

**只用 yarn** —— 项目依赖 yarn workspaces(`packageManager: yarn@4.11.0`)。pre-commit hook(lefthook)对 staged 文件跑 `eslint` + `tsc`,native 文件(`*.mm` / `*.kt`)跑 `clang-format` / `ktlint`(没装则跳过,CI 的 native-lint 才是硬 gate)。提交信息必须符合 conventional commits(commit-msg hook 用 commitlint 强校验)。

## 架构与约定

### 对外暴露(`src/index.tsx`)

barrel 重新导出:

```
<Scanner>          成品「扫一扫」屏(聚焦款,浅色);ScannerProps / ScanProduct
<HmsScanView>      headless 相机组件(只出预览 + 抛事件);HmsScanViewProps / TorchStatus
decodeImage        从本地图片识别 → ScanResult[]
权限               getCameraPermissionStatus / requestCameraPermission(→ CameraPermissionStatus)
码制工具           coerceFormat / coerceContentType / formatsToCsv
类型与常量         ALL_BARCODE_FORMATS、HmsScanError、ScanResult、BarcodeFormat ……
```

三种用法分层:`<Scanner>`(整屏可直接用)→ 内部用 `<HmsScanView>`(headless,自定义 UI 用这个)→ 底层都过原生 TurboModule / Fabric 组件。`decodeImage` 是独立的图片识别路径,不走相机。

### `<Scanner>`(`src/Scanner/`)

- **自带状态机 + 权限流 + ThemeProvider/ToastHost** —— 整屏直接丢进去即可,也兼容放进宿主已有的 `ThemeProvider`。
- 内部 `Phase` 状态机:`init → scan → detecting → success / fail / denied`。**一次扫一个**(扫到 `results[0]` 进 `detecting`,确认后 `reset` 回 `scan`);`handlingRef` 防重入。
- 取景框 / 工具栏 / 结果卡全用 `@unif/react-native-design` 的主题令牌与组件绘制(`@unif/react-native-design` 是 peer 依赖,统一风格)。
- **不内置图片选择器**(遵循 RN 惯例):`pickImage` 传了才显示「相册」按钮,内部对返回的本地 uri 调 `decodeImage`。`resolveProduct` 由宿主解析商品(返回 `null` / 抛错 = 未识别 → `fail`)。

### headless `<HmsScanView>`(`src/HmsScanView.tsx`)

只渲染相机预览并发出扫码事件,取景框 / 扫描线 / 手电按钮等覆盖层由上层用普通 RN 视图自己叠加。props:`formats`(限定码制,**省略 = 全部**)、`continuous`(默认 `true`)、`paused`(默认 `false`)、`torch`(默认 `false`,**iOS best-effort**)、`onScanResult(results: ScanResult[])`、`onScanError`、`onTorchStatus`。原生回传的是 JSON 字符串,组件内用 `parseResultsJson` 解析成强类型 `ScanResult[]` 再回调。

### 码制(`src/types.ts` / `src/format.ts`)

- **`ALL_BARCODE_FORMATS` 是 14 种**(不含 `UNKNOWN`):`QR_CODE` `AZTEC` `DATA_MATRIX` `PDF417` `CODABAR` `CODE_39` `CODE_93` `CODE_128` `EAN_8` `EAN_13` `UPC_A` `UPC_E` `ITF14` `MULTI_FUNCTIONAL`。**改这个清单是 `src/types.ts` 的 `ALL_BARCODE_FORMATS` 为单一真相源**(`BarcodeFormat` union、README、website docs、SKILL 都跟它对齐)。
- `formatsToCsv(formats)` 把 `formats[]` 转逗号分隔 CSV 传给原生;**空 / 未传 → `''`(= 识别全部码制)**。
- `coerceFormat` / `coerceContentType` / `parseResultsJson` 对原生回传做防御性收敛 —— 未知码制归 `UNKNOWN`,脏数据 / 解析失败返回空数组**而非抛错**。码制与内容类型在原生侧(Android `HmsScan.*` / iOS `HMSScanFormatTypeCode` + `sceneType`)已统一映射成字符串枚举再回 JS。

## 关键坑

- **iOS 扫码仅真机**:`ScanKitFrameWork` 是华为老式 fat framework(只有 arm64 真机 + x86_64 Intel 模拟器切片)。podspec 的 `prepare_command`(`scripts/prepare-scankit-xcframework.sh`)用 vtool 补出 arm64-sim 打成 xcframework;模拟器能编译但相机要真机。见到 `ld: building for iOS-simulator but linking in object built for iOS` **是预期**,切真机即可。`pod install` 的 `ScanKitFrameWork LICENSE` warning 无害。
- **`decodeImage` 不下载远程 URL** —— 只接受本地 `file://` / `content://`(Android)/ `ph://`(iOS)/ 绝对路径;识别网络图请宿主先下到本地再传。
- **`decodeImage` 返回空数组 `[]` 是正常结果**(图里没码),不是错误、不会 throw。别把 `!results.length` 当失败抛异常。(真正的失败 —— 图片加载失败 / 读权限缺失 —— 才抛 `HmsScanError`,带 `code`。)
- **iOS 手电是 best-effort**;`onTorchStatus.available`(暗光提示)**仅 Android 上报**,iOS 永不上报。
- **Android minSdkVersion ≥ 24**(Android 7.0)。华为 maven 源 + `scanplus` 依赖**已写在库自己的 `android/build.gradle` 里,宿主不用加**;也**无需 agconnect / agconnect-services.json / API Key**。
- **新架构限定**:宿主必须开新架构(Fabric + TurboModule)。`codegenConfig` 为 `ReactNativeHmsScanSpec`。

## 测试

- 测试 colocate 在 `src/__tests__/`(注意:与 design 仓不同 —— design 放仓库根 `__tests__/`,本仓在 `src/` 内)。
- 覆盖**纯逻辑**(`format`:`coerceFormat` / `formatsToCsv` / `parseResultsJson` 等)+ `<Scanner>` 状态机(`Scanner.test.tsx` 把 `HmsScanView` / 权限 / `decodeImage` 各自 `jest.mock` 成桩,捕获 `onScanResult` 触发扫码)+ `mock.test.ts`(自检官方 mock)。
- `jest` 用 `@react-native/jest-preset`,`setupFiles: ./jest.setup.ts`。
- **消费者**测试本库:用随包官方 mock 整包替换(避免 jest 环境加载 TurboModule / Fabric 组件崩溃):

  ```ts
  jest.mock('@unif/react-native-hms-scan', () => require('@unif/react-native-hms-scan/mock'));
  ```

  mock 下 `decodeImage` resolve `[]`、权限 resolve `'granted'`、`<Scanner>` / `<HmsScanView>` 渲染 `null`;纯函数(`coerceFormat` 等)与类型 / `HmsScanError` 保留真实实现。

## 文档与单一真相源

- **website docs(`website/docs/`)是 AI 读的源** —— `llms.txt` 由 `website/scripts/build-llms.js` 从这些 docs 生成。**改组件 / API / 类型时,docs 必须同步**,否则 llms 漂移。
- 全量 API / props 不在本仓正文镜像,路由到远程 llms.txt(按需 fetch):
  - 索引 https://unif-design.github.io/react-native-hms-scan/llms.txt
  - 全文 https://unif-design.github.io/react-native-hms-scan/llms-full.txt
- 消费侧(怎么用这个库)经过验证的 API / 坑 / 原生配置,见 skill `using-unif-hms-scan`(`react-native-skills` 仓 `skills/using-unif-hms-scan/SKILL.md`)。
- CI / 发版 / 依赖管理 / branch protection 的配置与排查 SOP,集中在 org 共享文档 → https://github.com/unif-design/.github/blob/main/AUTOMATION.md

## 仓库内注释风格

现有代码用中文记录非显而易见决策的 **why** —— 比如 podspec 为什么改 xcframework、为什么 `decodeImage` 空数组不当错误、为什么 `coerceFormat` 要防御性收敛原生回传。保持这个标准:能不写注释就不写,但当读者会想"为什么要这样写"时,就写一句把 why 讲清楚。
