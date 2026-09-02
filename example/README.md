# HMS Scan Example

`example/` 是 `@unif/react-native-hms-scan` 的展示宿主。首页提供三个独立入口：成品 `<Scanner>`、headless `<HmsScanView>` 与 `decodeImage` 本地图片识别。它使用 RN 0.86.3、React 19.2.3、`@unif/react-native-design` 0.30.0、`@sbaiahmed1/react-native-blur` 6.0.1 和 RNGH 3；这些是仓库开发基线，不会改变 library 在根 `package.json` 中的 public peer contract。

## 安装

在仓库根目录安装依赖：

```sh
yarn install --immutable
```

示例依赖 `react-native-image-picker`，但它和示例内的本地商品表都只服务演示；library 不会提供图片选择器或业务商品数据。

## Android Huawei Maven / iOS permissions

Android 的 `scanplus` 依赖需要宿主在实际参与依赖解析的 `repositories` 中加入 Huawei Maven：

```gradle
maven { url 'https://developer.huawei.com/repo/' }
```

Android 使用 Scan SDK-Plus 内置引擎，**非华为设备不需要 HMS Core、agconnect、`agconnect-services.json` 或 API Key**。扫码权限由 library Manifest 合并；示例 Manifest 不额外声明相机或定位权限。

iOS 宿主需要在 `Info.plist` 声明 `NSCameraUsageDescription`；本示例还因 image-picker 声明 `NSPhotoLibraryUsageDescription`。从仓库根目录安装 Pods；子 shell 会进入 `example/` 读取其中的 Gemfile，结束后仍回到仓库根目录：

```sh
(
  cd example
  bundle install
  bundle exec pod install --project-directory=ios
)
```

这会安装官方 `ScanKitFrameWork 1.1.2.305`。iOS Simulator 不支持，不能用 Simulator 构建或运行结果代替真机验证。

## Metro

```sh
yarn example start
```

在另一个终端启动目标平台。Metro 仅提供 JS bundle；扫码相机和图片解码仍须按下面的平台边界在设备上验证。

## Android 非华为真机 / iPhone physical device

Android 可使用非华为真机（也可使用已满足环境要求的 Android 目标）：

```sh
yarn example android
# CI/本地 arm64 contract build
yarn example build:android
```

iOS 只选择物理 iPhone：

```sh
yarn example ios
# generic physical iphoneos contract build，不签名
yarn example build:ios
```

不要改成 iOS Simulator，也不要伪造 Simulator slice。没有可用 iPhone 时，使用 Jest 覆盖 JS 行为并把 iOS 真机构建留给具备 Xcode/设备环境的门禁。

## Scanner

`Scanner` 是完整的扫一扫页：它管理相机权限、取景框、手电、状态机和结果确认卡；宿主只接入业务解析和导航。示例入口展示 `formats`、`autoConfirm`、相册选图和普通 `ScanError` 回调。

真机复现商品流时，选择“商品条码”并扫描 EAN-13 `6925303773908`，预期商品为“统一 阿萨姆原味奶茶 500ml”（`¥5.50`）。这是本地演示表唯一匹配项；其他条码由 `lookupDemoProduct` 返回 `null` 并进入未识别状态。关闭 `autoConfirm` 可查看商品确认卡，开启后会直接保存结果并返回配置页。

| prop | 说明 |
| --- | --- |
| `title` | 顶栏标题，默认“扫一扫”。 |
| `formats` | `readonly BarcodeFormat[]`；省略时识别全部。 |
| `hintText` | 取景态提示文字。 |
| `topInset` / `bottomInset` | 安全区边距，默认 54 / 34。 |
| `showTorch` | 是否显示手电按钮，默认 `true`；iOS 为 best-effort。 |
| `onClose` | 退出扫码页。 |
| `onScanError` | 接收普通 `{ code, message }`，不是 `HmsScanError`。 |
| `resolveProduct` | 宿主将 `ScanResult` 解析为 `ScanProduct`；返回 `null` / `undefined` 或抛错会进入未识别状态。 |
| `onConfirm` | 用户确认后接收 `(product, result)`。 |
| `autoConfirm` | 仅与 `onConfirm` 一起生效；成功后跳过结果卡，回调正常返回后停在 `done`。 |
| `pickImage` | 可选本地图片选择器；传入才显示相册按钮，取消时返回 `null`。 |

`Scanner` 使用 Design token 和组件绘制，也兼容宿主已有 `ThemeProvider`；如需自定义取景 UI，请使用下一节的 `HmsScanView`。

## HmsScanView

`HmsScanView` 只提供相机预览与事件。取景框、扫描线、按钮、权限流和错误 UI 均由宿主绘制和管理。示例演示了 headless 权限查询/请求/设置返回、手电与 `paused` / `continuous` 控制。

| prop | 默认值 | 说明 |
| --- | --- | --- |
| `formats` | 全部 | `readonly BarcodeFormat[]` 过滤码制。 |
| `continuous` | `true` | 是否持续扫描。 |
| `paused` | `false` | 是否暂停预览扫描。 |
| `torch` | `false` | 请求手电状态；iOS 为 best-effort。 |
| `onScanResult` | — | 接收已解析的 `ScanResult[]`。 |
| `onScanError` | — | 接收普通 `{ code, message }`。 |
| `onTorchStatus` | — | 接收 `{ available, on }`；`on` 才是实际点亮状态。 |

headless 使用方式下，相机权限与图片 URI grant 由宿主管理。`E_NO_RESULT` 是 soft error；其他 view 错误应由宿主决定重试或展示错误。

## decodeImage

`decodeImage` 在设备本地离线识别图片，不走相机：

```ts
const results = await decodeImage(localUri, { formats: ['QR_CODE'] });
```

支持的 URI 因平台不同：iOS 支持 `file://`、绝对路径和 `data:`；Android 支持 `file://`、绝对路径、`content://` 与 `android.resource://`。跨平台优先传 `file://` 或绝对路径。

## 空数组/错误语义

成功加载但没有识别到码时，`decodeImage` resolve `[]`；这是正常“空结果”，不是错误。图片加载失败或 URI 不被当前平台支持时会 throw `HmsScanError`（例如 `E_IMAGE_LOAD_FAILED` 或 `E_DECODE_FAILED`）。

`decodeImage` **不会下载 URL**：`http(s)://` 不是可识别输入，先下载到设备本地再调用。图片选择器取消也不是错误，示例会回到 idle 状态。

## 复制边界

可复制示例的权限处理、`HmsScanView` 状态控制、`Scanner` props 适配和 `decodeImage` 成功/空/错误分支。不要复制以下示例专用实现为 library 行为：

- `react-native-image-picker` 的调用与相册文案；由宿主选择自己的图片选择器。
- `showcases/scanner/products.ts` 的本地商品表；由宿主接入真实业务解析。
- 示例导航、展示文案与测试用 mock；它们不属于 public API。

library 只提供三种扫码能力及其公开类型；任何应用层权限、业务数据、导航、Design 外观扩展都应保留在宿主。

## 测试矩阵

| 场景 | 命令 / 环境 | 预期 |
| --- | --- | --- |
| JS（含 example） | `yarn test --runInBand` | 根 Jest 与 Android/iOS integration contract 通过。 |
| 类型与 lint | `yarn typecheck` / `yarn lint` | 根 TypeScript 与 ESLint 覆盖 example 源码。 |
| Android native | `yarn example build:android` | arm64 Android build。 |
| iOS native | `(cd example && bundle install && bundle exec pod install --project-directory=ios)` 后 `yarn example build:ios` | generic physical iphoneos build；不是 Simulator。 |
| website / llms | `yarn prepare`、`node website/scripts/build-llms.test.js`、website `typecheck` / `build` | 文档站与生成入口通过。 |

完整 CI 也会显式执行 root Jest、lint、typecheck、两个原生 integration contract 和 website 门禁。
