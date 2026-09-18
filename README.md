# @unif/react-native-hms-scan

基于 HUAWEI Scan Kit 的 React Native 扫码库，支持实时扫码和本地图片识别。

[文档站](https://unif-design.github.io/react-native-hms-scan/) · [npm](https://www.npmjs.com/package/@unif/react-native-hms-scan) · [示例](example/README.md)

## 提供什么

| 入口          | 用途                                   |
| ------------- | -------------------------------------- |
| `Scanner`     | 带权限流程、取景和结果确认的扫一扫页面 |
| `HmsScanView` | 仅提供预览与事件，由应用组合界面       |
| `decodeImage` | 识别本地图片中的二维码或条码           |

## 安装

```sh
yarn add @unif/react-native-hms-scan
```

按[安装指南](website/docs/getting-started/installation.md)补齐 peer 依赖、相机权限和原生配置：Android 需要 Huawei Maven；iOS 使用官方 ScanKit CocoaPod。

Android 内置识别引擎，不要求华为手机或 HMS Core。两端均不需要 AppGallery Connect 或 API Key。当前 iOS SDK 仅支持真机，React Native 需开启新架构。

## 最小用法

```ts
import { decodeImage } from '@unif/react-native-hms-scan';

const results = await decodeImage('file:///path/to/photo.jpg', {
  formats: ['QR_CODE'],
});
```

正常识别但没有发现码时返回 `[]`；读取或解码失败抛出 `HmsScanError`。函数不下载网络图片，应用需先准备本地文件。

## 文档与开发

- [Scanner](website/docs/api/scanner.md) · [HmsScanView](website/docs/api/hms-scan-view.md) · [函数 API](website/docs/api/functions.md)
- [运行示例](example/README.md) · [开发资料与新版本契约](docs/DEVELOPMENT.md)
- [AI 文档索引](https://unif-design.github.io/react-native-hms-scan/llms.txt)
- [研发技能](https://github.com/unif-skill/unif-portal-dev-skills) · [MIT 许可](LICENSE)
