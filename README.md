# @unif/react-native-hms-scan

[![npm](https://img.shields.io/npm/v/@unif/react-native-hms-scan.svg?color=cb3837&logo=npm)](https://www.npmjs.com/package/@unif/react-native-hms-scan)
[![CI](https://github.com/unif-design/react-native-hms-scan/actions/workflows/ci.yml/badge.svg)](https://github.com/unif-design/react-native-hms-scan/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/@unif/react-native-hms-scan.svg?color=blue)](LICENSE)
[![Docs](https://img.shields.io/badge/docs-unif--design.github.io-orange.svg)](https://unif-design.github.io/react-native-hms-scan/)

华为 **HMS 统一扫码(HUAWEI Scan Kit)** 的 React Native 封装,面向 RN 0.85 新架构(Fabric + TurboModule):成品扫一扫页、headless 自定义扫码 UI、从图片识别条码 / 二维码。

## 特性

- **三种用法** — 成品 `<Scanner>` 扫一扫页(自带权限流 / 状态机 / 主题)、headless `<HmsScanView>` 相机组件(自定义 UI)、`decodeImage(uri)` 从本地图片识别。
- **Android 内置引擎** — 用 Scan SDK-Plus,**非华为机型可用**,不依赖设备装 HMS Core APK;`scanplus` 由本库声明,宿主需把 Huawei Maven 加到实际参与依赖解析的 `repositories`。
- **iOS 官方 CocoaPod** — CocoaPods 安装官方 `ScanKitFrameWork 1.1.2.305`,当前只支持真机构建和运行。
- **零云端配置** — 两端**都不需要 AppGallery Connect / agconnect / API Key**。
- **14 种码制** — `QR_CODE` / `EAN_13` / `CODE_128` / `PDF417` / `DATA_MATRIX` 等,默认识别全部。
- 仅支持 **RN 新架构**;`@unif/react-native-design` 风格统一。

## 安装

```sh
yarn add @unif/react-native-hms-scan react-native-svg
cd ios && pod install
```

CocoaPods 会直接安装官方 `ScanKitFrameWork 1.1.2.305`;`pod install` 不会在 `node_modules` 中生成 XCFramework。iOS Simulator 不属于支持目标。

Android 宿主还必须在实际参与依赖解析的仓库列表中加入 Huawei Maven;库模块自己的 `repositories` 不会传播给 consumer:

```gradle
allprojects {
  repositories {
    maven { url 'https://developer.huawei.com/repo/' }
  }
}
```

`react-native-svg` 是 peer 依赖(`<Scanner>` 图标用它绘制);`<Scanner>` 还依赖 peer `@unif/react-native-design`。宿主需开启新架构。完整 peer dependencies、Android 权限、iOS `NSCameraUsageDescription` 等见[文档站 · 安装](https://unif-design.github.io/react-native-hms-scan/docs/getting-started/installation)。

## 快速开始

成品「扫一扫」页 —— 扫到条码后由宿主解析商品、确认带回:

```tsx
import { Scanner, type ScanResult, type ScanProduct } from '@unif/react-native-hms-scan';

function ScanScreen({ navigation }) {
  return (
    <Scanner
      title="扫一扫"
      onClose={() => navigation.goBack()}
      resolveProduct={async (r: ScanResult): Promise<ScanProduct | null> => {
        const p = await api.lookupByBarcode(r.value); // 你来解析;返回 null = 未识别
        return p ? { name: p.name, brand: p.brand, price: `¥${p.price}`, barcode: r.value } : null;
      }}
      onConfirm={(product, result) => navigation.navigate('Order', { product, barcode: result.value })}
    />
  );
}
```

headless `<HmsScanView>`(完全自定义 UI)、图片识别 `decodeImage`、权限、平台差异 —— 见[文档站](https://unif-design.github.io/react-native-hms-scan/)。

## 文档

- **完整文档**(安装 · 平台配置 · API · 平台差异 · 故障排查):https://unif-design.github.io/react-native-hms-scan/
- **AI / Agent**(按需 fetch,别凭记忆猜 API):[llms.txt](https://unif-design.github.io/react-native-hms-scan/llms.txt) · [llms-full.txt](https://unif-design.github.io/react-native-hms-scan/llms-full.txt)
- **Agent Skill** `hms-scan`(`unif` plugin):`/plugin marketplace add unif-design/skills` → `/plugin install unif@skills`

## 兼容性

| 平台 | 支持 |
| --- | --- |
| React Native | 新架构(Fabric + TurboModule)**必须开启**;在 RN 0.85 上开发与验证 |
| Android | ✅ minSdkVersion ≥ 24(Android 7.0) |
| iOS | ✅ 官方 CocoaPod `ScanKitFrameWork 1.1.2.305` + 真机 |
| iOS Simulator | ❌ 不支持;无硬件逻辑测试使用随包 Jest mock |

## 许可

MIT © unif-design
