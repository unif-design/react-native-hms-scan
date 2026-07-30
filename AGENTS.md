# AGENTS.md

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

改库内部、加 API 前先看这里:三种用法怎么分层、各组件各管什么、码制工具为什么要防御性收敛。

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

- **开箱即用** — 自带状态机 + 权限流 + `ThemeProvider`/`ToastHost`,整屏直接丢进去即可;也兼容放进宿主已有的 `ThemeProvider`。
- **状态机** — `Phase`:`init → scan → detecting → success / fail / denied`。**一次扫一个**(扫到 `results[0]` 进 `detecting`,确认后 `reset` 回 `scan`),`handlingRef` 防重入。
- **样式** — 取景框 / 工具栏 / 结果卡全用 `@unif/react-native-design`(peer 依赖)的主题令牌与组件绘制,统一风格。
- **图片选择器不内置**(遵循 RN 惯例) — `pickImage` 传了才显示「相册」按钮,内部对返回的本地 uri 调 `decodeImage`。
- **商品解析交宿主** — `resolveProduct` 由宿主解析商品,返回 `null` / 抛错 = 未识别 → `fail`。

### headless `<HmsScanView>`(`src/HmsScanView.tsx`)

只渲染相机预览并发出扫码事件,取景框 / 扫描线 / 手电按钮等覆盖层由上层用普通 RN 视图自己叠加。props:

| prop | 默认 | 说明 |
| --- | --- | --- |
| `formats` | 省略 = 全部 | 限定码制 |
| `continuous` | `true` | 连续扫描 |
| `paused` | `false` | 暂停 |
| `torch` | `false` | 手电,**iOS best-effort** |
| `onScanResult(results: ScanResult[])` | — | 扫到码 |
| `onScanError` | — | 扫码出错 |
| `onTorchStatus` | — | 手电状态 |

原生回传的是 JSON 字符串,组件内用 `parseResultsJson` 解析成强类型 `ScanResult[]` 再回调。

### 码制(`src/types.ts` / `src/format.ts`)

- **清单** — `ALL_BARCODE_FORMATS` 是 14 种(不含 `UNKNOWN`):`QR_CODE` `AZTEC` `DATA_MATRIX` `PDF417` `CODABAR` `CODE_39` `CODE_93` `CODE_128` `EAN_8` `EAN_13` `UPC_A` `UPC_E` `ITF14` `MULTI_FUNCTIONAL`。
- **单一真相源** — 改清单只动 `src/types.ts` 的 `ALL_BARCODE_FORMATS`,`BarcodeFormat` union / README / website docs / SKILL 都跟它对齐。
- **转 CSV** — `formatsToCsv(formats)` 把 `formats[]` 转逗号分隔 CSV 传给原生;**空 / 未传 → `''`(= 识别全部码制)**。
- **防御性收敛** — `coerceFormat` / `coerceContentType` / `parseResultsJson` 对原生回传收敛:未知码制归 `UNKNOWN`,脏数据 / 解析失败返回空数组**而非抛错**。

> 码制与内容类型在原生侧已统一映射成字符串枚举再回 JS(Android `HmsScan.*` / iOS `HMSScanFormatTypeCode` + `sceneType`)→ JS 侧再防御性收敛,双重保证回调拿到的永远是合法枚举。

## 关键坑

接入 / 改动时最容易踩的;前两个(iOS 真机、`decodeImage` 的 URI 与空数组语义)是最高频问题。

- **iOS 扫码仅真机** — 模拟器能编译,但相机要真机。
  - **为什么** — `ScanKitFrameWork` 是华为老式 fat framework,只有 arm64 真机 + x86_64 Intel 模拟器切片(无 arm64-sim);podspec 的 `prepare_command`(`scripts/prepare-scankit-xcframework.sh`)用 vtool 补出 arm64-sim 打成 xcframework。
  - **预期噪声** — 见到 `ld: building for iOS-simulator but linking in object built for iOS` 是预期,切真机即可;`pod install` 的 `ScanKitFrameWork LICENSE` warning 无害。
- **`decodeImage` 只吃本地 URI,不下载远程 URL**,且接受的本地 URI 因平台而异:

  | URI 形式 | iOS | Android |
  | --- | --- | --- |
  | `file:///绝对路径` | ✅ | ✅ |
  | `data:` | ✅ | ✅ |
  | `content://` | ❌ | ✅ |
  | `ph://` / `assets-library://` | ❌ | ❌ |

  识别网络图请宿主先下到本地再传;传远程 / 当前平台不支持的 URI 会**抛 `E_IMAGE_LOAD_FAILED`**(不是返回 `[]`)。
- **`decodeImage` 空数组 `[]` 是正常结果**(图里没码),不是错误、不会 throw,别把 `!results.length` 当失败抛异常。**真正的失败**(图片加载失败 / 读权限缺失)才抛 `HmsScanError`(带 `code`)。
- **手电 iOS best-effort** — `torch` 在 iOS 尽力而为;`onTorchStatus.available`(暗光提示)**仅 Android 上报,iOS 永不上报**。
- **Android 配置宿主不用动** — minSdkVersion ≥ 24(Android 7.0);华为 maven 源 + `scanplus` 依赖**已写在库自己的 `android/build.gradle` 里**;**无需 agconnect / agconnect-services.json / API Key**。
- **仅新架构** — 宿主必须开新架构(Fabric + TurboModule),`codegenConfig` 为 `ReactNativeHmsScanSpec`。

## 测试

加 / 改测试,或下游消费者要 mock 本库时看这里。

- 测试 colocate 在 `src/__tests__/`(注意:与 design 仓不同 —— design 放仓库根 `__tests__/`,本仓在 `src/` 内)。
- 覆盖**纯逻辑**(`format`:`coerceFormat` / `formatsToCsv` / `parseResultsJson` 等)+ `<Scanner>` 状态机(`Scanner.test.tsx` 把 `HmsScanView` / 权限 / `decodeImage` 各自 `jest.mock` 成桩,捕获 `onScanResult` 触发扫码)+ `mock.test.ts`(自检官方 mock)。
- `jest` 用 `@react-native/jest-preset`,`setupFiles: ./jest.setup.ts`。
- **消费者**测试本库:用随包官方 mock 整包替换(避免 jest 环境加载 TurboModule / Fabric 组件崩溃):

  ```ts
  jest.mock('@unif/react-native-hms-scan', () => require('@unif/react-native-hms-scan/mock'));
  ```

  mock 下 `decodeImage` resolve `[]`、权限 resolve `'granted'`、`<Scanner>` / `<HmsScanView>` 渲染 `null`;纯函数(`coerceFormat` 等)与类型 / `HmsScanError` 保留真实实现。

## 文档与 Skill 联动检查

每次改完库都要判断 website docs、llms.txt 和消费侧 Skill 是否需要同步;不要只在新增
API 时检查。纯内部重构也必须完成核对,无需修改时在交付结果中写明理由。

### 文档数据源

- **API / props / 类型全量** → 同步 `website/docs/`,再运行
  `website/scripts/build-llms.js` 重生成 llms;website docs 是 llms.txt 的唯一来源。
- **远程入口** → 文档站 https://unif-design.github.io/react-native-hms-scan/、
  llms 索引 https://unif-design.github.io/react-native-hms-scan/llms.txt、
  llms 全文 https://unif-design.github.io/react-native-hms-scan/llms-full.txt。

### 本库对应 Skill 的精确位置

- **Skills 仓** → 相对本仓 `../skills/`;当前本机绝对路径
  `/Users/liulijun/tongyi/design/skills/`。
- **本库 Skill** → `hms-scan`;相对本仓 `../skills/skills/hms-scan/`;当前本机绝对路径
  `/Users/liulijun/tongyi/design/skills/skills/hms-scan/`。
- **入口** → `../skills/skills/hms-scan/SKILL.md`。
- **安装** → `/plugin marketplace add unif-design/skills` 后运行
  `/plugin install unif@skills`。

检查 `../skills/skills/hms-scan/` 下与本库对应的全部文件:

| 文件 | 何时同步 |
| --- | --- |
| `SKILL.md` | `Scanner` / `HmsScanView` / `decodeImage` API、码制、mock、文档 URL 或关键语义变化 |
| `assets/ScannerScreen.tsx` | `<Scanner>` 快速开始示例或确认流程变化 |
| `references/native-setup.md` | peer dependencies、minSdk、新架构、Manifest、权限或 iOS 配置变化 |
| `references/troubleshooting.md` | 平台差异、事件、URI、错误码或排障结论变化 |
| `scripts/doctor.sh` | 可自动检测的宿主依赖或原生配置变化 |
| `scripts/doctor.test.sh` | `doctor.sh` 检查项或三态输出变化 |

### 改动后的执行顺序

1. 判断改动是否影响公开 API、示例、平台配置、错误语义、依赖、测试 mock 或文档 URL。
2. 同步 `website/docs/` 并按需重生成 llms。
3. 逐项核对 `../skills/skills/hms-scan/` 的六个文件;只修改被当前改动影响的文件。
4. 若修改 `doctor.sh`,必须同步 `doctor.test.sh`。
5. 验证 sibling Skill;不得因为 Skills 仓已有其他未提交改动而覆盖或提交无关文件。
6. 交付时说明 website / llms / Skill 的核对结果;无需修改也要写明理由。

作为消费者接入时优先使用 `hms-scan` Skill 中经核实的 API、原生配置与排障结论。
CI / 发版 / 依赖管理 / branch protection 的配置与排查 SOP 见
https://github.com/unif-design/.github/blob/main/AUTOMATION.md,本仓约定亦见 `README.md`
与 `.github/`.

## 仓库内注释风格

现有代码用中文记录非显而易见决策的 **why** —— 比如 podspec 为什么改 xcframework、为什么 `decodeImage` 空数组不当错误、为什么 `coerceFormat` 要防御性收敛原生回传。保持这个标准:能不写注释就不写,但当读者会想"为什么要这样写"时,就写一句把 why 讲清楚。
