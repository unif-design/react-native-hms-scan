# @unif/react-native-hms-scan

基于 HUAWEI Scan Kit 的 React Native 扫码库，支持实时扫码和本地图片识别。库交付原始码值，商品、客户或登录等业务含义由应用处理。

[文档站](https://unif-design.github.io/react-native-hms-scan/) · [npm](https://www.npmjs.com/package/@unif/react-native-hms-scan) · [运行示例](example/README.md)

## 选择入口

| 需要做什么         | 使用入口                                                         |
| ------------------ | ---------------------------------------------------------------- |
| 使用完整扫一扫页面 | [Scanner](website/docs/api/scanner.md)：权限、取景与结果确认     |
| 自定义扫码界面     | [HmsScanView](website/docs/api/hms-scan-view.md)：预览与扫码事件 |
| 识别本地图片       | [decodeImage](website/docs/api/functions.md)：二维码与条码识别   |

## 安装

| 项目         | 要求                                  |
| ------------ | ------------------------------------- |
| React Native | `>=0.86.0`，启用新架构                |
| React        | `>=19.2.3 <20.0.0`                    |
| Android      | API 24+；宿主配置 Huawei Maven        |
| iOS          | 使用官方 ScanKit CocoaPod；仅支持真机 |

```sh
yarn add @unif/react-native-hms-scan
```

按[安装指南](website/docs/getting-started/installation.md)补齐 peer 依赖、相机权限和原生配置后重新构建。Android 内置识别引擎，不要求华为手机或 HMS Core；两端无需 AppGallery Connect 或 API Key。Web 不提供扫码能力。

## 最小用法

图片识别不需要相机权限。应用先准备可读的 `file:///...` URI，再调用：

```ts
import { decodeImage } from '@unif/react-native-hms-scan';

export function readQrCodes(uri: string) {
  return decodeImage({ uri, formats: ['QR_CODE'] });
}
```

返回的 Promise 提供本次 `ScanResult` 集合。空数组只表示 SDK 未交付结果，不能证明图片中没有码；本库检测到的读取、解码或桥接错误会抛出 `ScanError`。

文件借用持续到 Promise 结束，之后才能归还或删除；函数不下载图片。完整错误语义与 Android SDK 的静默失败边界见[图片识别](website/docs/guides/decode-image.md)。

## 进一步使用

- [快速接入 Scanner](website/docs/getting-started/quick-start.md) · [自定义预览](website/docs/guides/headless.md)
- [平台差异](website/docs/platform-differences.md) · [常见问题](website/docs/troubleshooting.md)
- [开发资料](docs/DEVELOPMENT.md) · [库能力技能](website/docs/skills.md) · [AI 文档索引](https://unif-design.github.io/react-native-hms-scan/llms.txt)

[MIT 许可](LICENSE)
