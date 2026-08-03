# AGENTS.md
<!-- BEGIN UNIF REACT NATIVE STANDARD -->

## 共享标准启动

你维护的仓库是 `react-native-hms-scan`。本区块只负责启动与失效保护;完整共享流程由
`rn-library` Skill 管理,marker 外只保存本仓特有规则。

开始任何任务前:

1. 运行 `git status --short --branch`;位于 `main` 时,在首次写入前创建语义明确的任务分支。
2. 保留已有改动,不得覆盖、暂存或提交与当前任务无关的文件。
3. 查找并读取 `rn-library` 与 `hms-scan` Skill,两者叠加使用。
4. Skill 缺失时,按当前 Agent 选择一条全局安装命令:

```sh
# Codex
npx skills add unif-design/skills --skill rn-library --skill hms-scan --global --agent codex --yes

# Claude Code
npx skills add unif-design/skills --skill rn-library --skill hms-scan --global --agent claude-code --yes
```

安装完成后重新读取两个 Skill。安装失败、需要认证或仍无法读取时停止修改并报告,不得跳过
共享门禁。仓库正文只能补充或收紧共享规则;发现真实冲突时如实报告。

<!-- END UNIF REACT NATIVE STANDARD -->

## 仓库定位

`@unif/react-native-hms-scan` —— 华为 **HMS 统一扫码(Scan Kit)** 的 React Native 封装。提供三种用法:成品「扫一扫」页 `<Scanner>`、headless 相机组件 `<HmsScanView>`、从本地图片识别 `decodeImage`。当前开发与 example 基线为 **RN 0.86.2 新架构**(Fabric + TurboModule)、React 19.2.3、TypeScript 6。**仅支持新架构**。

Android 用 **Scan SDK-Plus**(`com.huawei.hms:scanplus`,**内置引擎,非华为机也能用,不依赖设备装 HMS Core APK**);iOS 通过 CocoaPods 安装官方 **ScanKitFrameWork 1.1.2.305**,仅支持真机。两端**都不需要 AppGallery Connect / agconnect / API Key**。

yarn workspaces 单仓库:库本体在根目录,`example/` 是宿主 RN app,`website/` 是 Docusaurus 文档站。

## 常用命令

除非另注,命令都在仓库根目录执行。

```sh
yarn                  # 安装(yarn 4.11,node v24.13.0,见 .nvmrc)
yarn typecheck        # tsc(strict)
yarn lint             # eslint **/*.{js,ts,tsx}
yarn test             # integration contracts + root Jest（src/ 与 example 测试）
yarn test src/__tests__/format.test.ts    # 跑单文件
yarn test -t "pattern"                    # 按测试名过滤
yarn jest example/src --runInBand          # 只跑 example showcase 测试（root Jest 配置）
yarn test --runInBand                      # integration contracts + root Jest（含 example）
yarn prepare          # react-native-builder-bob → lib/module(ESM)+ lib/typescript(.d.ts)
yarn clean            # 清 lib/ + example 原生构建产物

# example 应用(扫码功能需真机,见下)
yarn example start    # metro
yarn example ios      # 构建并跑 iOS
yarn example android  # 构建并跑 Android

# 文档站
yarn workspace @unif/react-native-hms-scan-website build:llms
```

**只用 yarn** —— 项目依赖 yarn workspaces(`packageManager: yarn@4.11.0`)。pre-commit hook(lefthook)对 staged 文件跑 `eslint` + `tsc`,native 文件(`*.mm` / `*.kt`)跑 `clang-format` / `ktlint`(没装则跳过,CI 的 native-lint 才是硬 gate)。

## 当前依赖基线

开发与 example 使用 `@unif/react-native-design@0.20.0`、React `19.2.3`、RN `0.86.2`、RNGH 3(`^3.1.0`)和 Carousel 5(`^5.0.0`)。发布包的 public peer contract **保持根 `package.json` 既有原值**（包括 Design `>=0.8.0`、RN `>=0.80.0`、RNGH `>=2.21.0` 等）；不得为了开发基线而收紧或改写 public peers。

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

- **开箱即用** — 自带状态机 + 权限流 + `ThemeProvider`,整屏直接丢进去即可;也兼容放进宿主已有的 `ThemeProvider`。
- **Toast** — `ToastHost` 是宿主职责,按需在 App 根部挂载。
- **状态机** — `Phase`:`init → scan → detecting → success / fail / denied / error / done`。默认成功进入 `success`,点「确定」或「重扫」后 `reset` 回 `scan`;`autoConfirm` 在有 `onConfirm` 时跳过结果卡、调用成功后进入 `done`,相机保持暂停且不自动重扫;未传 `onConfirm` 则回退结果卡。未识别仍进入 `fail`,`handlingRef` 防双入口;独立 processing generation 跨 `pickImage` / `decodeImage` / `resolveProduct` 的 await 校验,fatal、denied、reset、retry 会让旧链失效且不得再写 phase 或触发 `onConfirm`;scan session generation 会拒绝 retry、设置恢复或 reset 后才到达的旧 view callback。
- **`done` 的前提是 `onConfirm` 正常返回** — `resolveProduct` 与 `onConfirm` 在 `handleResult` 的同一个 `try` 内调用,`setPhase('done')` 排在 `onConfirm` 之后。宿主 `onConfirm` 同步 throw 会被同一个 `catch` 收成 `fail`(可重扫),**不会**进入 `done`。不得把 `autoConfirm` 描述成「调用 `onConfirm` 即必然进入终态」。
- **权限与相机异常边界** — view error 分三路:`E_NO_RESULT` 是 soft error,只经 `onScanError` 上报而不切换 phase;`E_NO_CAMERA_PERMISSION` 进入 `denied` 并卸载相机 view;其余 fatal view error 进入可重试的 `error`。权限 helper reject、打开系统设置失败也进入 `error`;从系统设置返回 App 后会自动重新查询权限。`onScanError` 收到的是普通 `ScanError` `{ code, message }`,不是 `HmsScanError`;可能包括 `E_CAMERA_INIT`、`E_NO_RESULT`、`E_NO_ACTIVITY` 或 `E_UNKNOWN`。
- **样式** — 取景框 / 工具栏 / 结果卡全用 `@unif/react-native-design`(peer 依赖)的主题令牌与组件绘制,统一风格。
- **图片选择器不内置**(遵循 RN 惯例) — `pickImage` 传了才显示「相册」按钮,内部对返回的本地 uri 调 `decodeImage`。
- **商品解析交宿主** — `resolveProduct` 由宿主解析商品,返回 `null` / 抛错 = 未识别 → `fail`。

### headless `<HmsScanView>`(`src/HmsScanView.tsx`)

只渲染相机预览并发出扫码事件,取景框 / 扫描线 / 手电按钮等覆盖层由上层用普通 RN 视图自己叠加。props:

| prop | 默认 | 说明 |
| --- | --- | --- |
| `formats` | `readonly BarcodeFormat[]`；省略 = 全部 | 限定码制 |
| `continuous` | `true` | 连续扫描 |
| `paused` | `false` | 暂停 |
| `torch` | `false` | 手电,**iOS best-effort** |
| `onScanResult(results: ScanResult[])` | — | 扫到码 |
| `onScanError` | `(error: ScanError) => void` | 扫码出错；普通 `{ code, message }`，不是 `HmsScanError` |
| `onTorchStatus` | — | 手电状态 |

原生回传的是 JSON 字符串,组件内用 `parseResultsJson` 解析成强类型 `ScanResult[]` 再回调。

### 码制(`src/types.ts` / `src/format.ts`)

- **清单** — `ALL_BARCODE_FORMATS` 是 14 种(不含 `UNKNOWN`):`QR_CODE` `AZTEC` `DATA_MATRIX` `PDF417` `CODABAR` `CODE_39` `CODE_93` `CODE_128` `EAN_8` `EAN_13` `UPC_A` `UPC_E` `ITF14` `MULTI_FUNCTIONAL`。
- **单一真相源** — 改清单只动 `src/types.ts` 的 `ALL_BARCODE_FORMATS`,`BarcodeFormat` union / README / website docs / SKILL 都跟它对齐。
- **转 CSV** — `formatsToCsv(formats)` 把 `formats[]` 转逗号分隔 CSV 传给原生;**空 / 未传 → `''`(= 识别全部码制)**。
- **防御性收敛** — `coerceFormat` / `coerceContentType` / `parseResultsJson` 对原生回传收敛:未知码制归 `UNKNOWN`,脏数据 / 解析失败返回空数组**而非抛错**。
- **平台过滤差异** — Android 支持全部 14 种;`MULTI_FUNCTIONAL` 在 iOS 无对应过滤码制,`ITF14` 在 iOS 映射到底层 `ITF`;iOS 过滤项全部无效(如仅传 `MULTI_FUNCTIONAL` / `UNKNOWN`)时回退为识别全部码制。

> 码制与内容类型在原生侧已统一映射成字符串枚举再回 JS(Android `HmsScan.*` / iOS `HMSScanFormatTypeCode` + `sceneType`)→ JS 侧再防御性收敛,双重保证回调拿到的永远是合法枚举。

## 关键坑

接入 / 改动时最容易踩的;前两个(iOS 真机、`decodeImage` 的 URI 与空数组语义)是最高频问题。

- **iOS 原生目标仅支持真机** — `pod install` 通过 CocoaPods 安装官方 `ScanKitFrameWork 1.1.2.305`,不会在 `node_modules` 中生成 XCFramework。相机扫码与 `decodeImage` 原生路径都用真机验证;无硬件逻辑测试使用随包 Jest mock。
  - **Simulator 是明确的不支持目标** — 架构 / 链接失败属于当前预期边界,应切换物理设备;不得通过修改宿主 Podfile、改写二进制平台标记或伪造 Simulator 切片规避。真正的真机构建若找不到 `ScanKitFrameWork.h`,才按 CocoaPods 集成故障排查并核对 lockfile 是否为 `1.1.2.305`。
  - **可忽略 warning** — `pod install` 的 `ScanKitFrameWork LICENSE` warning 无害。
- **权限边界** — Android 库 Manifest 已声明 `CAMERA`、`READ_MEDIA_IMAGES` 和 `READ_EXTERNAL_STORAGE(maxSdkVersion=32)`并合入宿主,但运行时授权不会自动完成:`<Scanner>` 只自动管理相机权限,`<HmsScanView>` 与 `decodeImage` 所需权限 / URI grant 由宿主管理。iOS 宿主必须声明 `NSCameraUsageDescription`,相册权限由宿主图片选择器负责。Android 的 `getCameraPermissionStatus` 对未授权只返回 `denied`,区分 `denied` / `blocked` 以 `requestCameraPermission` 的请求后结果为准;无当前 `PermissionAwareActivity` 时请求会 reject `E_NO_ACTIVITY`,不是返回某个 status。iOS 只可能返回 `granted` / `undetermined` / `blocked` —— 原生把 `denied` 与 `restricted` 都映射为 `blocked`,永远不返回 `denied`。
- **`decodeImage` 只吃本地 URI,不下载远程 URL**,且接受形式因平台而异:

  | URI 形式 | iOS | Android |
  | --- | --- | --- |
  | `file:///...` / 绝对路径 | ✅ | ✅ |
  | `data:` | ✅ | ❌ |
  | `content://` | ❌ | ✅ |
  | `android.resource://` | ❌ | ✅ |
  | `ph://` / `assets-library://` | ❌ | ❌ |
  | `http(s)://` | ❌ | ❌ |

  远程 / 当前平台不支持的 URI 会抛 `E_IMAGE_LOAD_FAILED`,不是返回 `[]`;跨平台优先传 `file://` 或绝对路径。
- **`decodeImage` 空数组 `[]` 是正常结果**(图里没码),不是错误、不会 throw。
- **错误通道不要混用** — `decodeImage` 失败会 throw `HmsScanError`;当前原生明确产生 `E_IMAGE_LOAD_FAILED` / `E_DECODE_FAILED`,其他 native reject 在 JS 收敛为 `E_UNKNOWN`。`<HmsScanView>` 则通过 `onScanError({ code, message })` 上报普通对象,不是 `HmsScanError`;当前 view 原生 code 为 Android `E_CAMERA_INIT`、iOS `E_NO_RESULT`。
- **手电 iOS best-effort** — iOS 的 `torch` 可能不生效;`onTorchStatus` 会随 `torch` 初次应用 / 变更回传,其中 `available` 表示是否有手电硬件、`on` 表示真实点亮状态,不是暗光信号。只有 Android 的 `available` 来自环境光回调;`<Scanner>` 的手电标签最终以 `onTorchStatus.on` 回写为准。
- **Android 宿主必须添加 Huawei Maven** — `scanplus` 依赖由库声明,但库项目的 repository 不传播给 consumer;宿主须在实际参与依赖解析的 `repositories` 中加入 `https://developer.huawei.com/repo/`。仍然无需 agconnect、`agconnect-services.json` 或 API Key,minSdkVersion 必须 ≥24。
- **仅新架构** — 宿主必须开新架构(Fabric + TurboModule),`codegenConfig` 为 `ReactNativeHmsScanSpec`。

## 测试

加 / 改测试,或下游消费者要 mock 本库时看这里。

- 测试 colocate 在 `src/__tests__/`(注意:与 design 仓不同 —— design 放仓库根 `__tests__/`,本仓在 `src/` 内)。
- 覆盖纯逻辑(`format`)、`<Scanner>` 状态机(含权限、从设置返回重查、fatal error、普通确认、`autoConfirm` 回退结果卡及未识别分支)、相册并发、旧异步链失效与跨 scan session 迟到 callback、手电状态回写、readonly 类型、`ResultFocus` 可读性 token 和官方 mock 自检;组件测试只 mock 原生边界、权限与 `decodeImage`;Android torch 的 RemoteView 生命周期 / 回读 / emit 契约由 `scripts/verify-android-integration.mjs` 锁定。
- `jest` 用 `@react-native/jest-preset`,`setupFiles: ./jest.setup.ts`。
- **消费者**测试本库:用随包官方 mock 整包替换(避免 jest 环境加载 TurboModule / Fabric 组件崩溃):

  ```ts
  jest.mock('@unif/react-native-hms-scan', () => require('@unif/react-native-hms-scan/mock'));
  ```

  mock 下 `decodeImage` resolve `[]`、权限 resolve `'granted'`、`<Scanner>` / `<HmsScanView>` 渲染 `null`;纯函数(`coerceFormat` 等)与类型 / `HmsScanError` 保留真实实现。

## 仓库内注释风格

现有代码用中文记录非显而易见决策的 **why** —— 比如 podspec 为什么固定官方 CocoaPod、为什么 `decodeImage` 空数组不当错误、为什么 `coerceFormat` 要防御性收敛原生回传。保持这个标准:能不写注释就不写,但当读者会想"为什么要这样写"时,就写一句把 why 讲清楚。
