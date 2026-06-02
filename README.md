# @unif/react-native-hms-scan

[![npm](https://img.shields.io/npm/v/@unif/react-native-hms-scan.svg?color=cb3837&logo=npm)](https://www.npmjs.com/package/@unif/react-native-hms-scan)
[![CI](https://github.com/unif-design/react-native-hms-scan/actions/workflows/ci.yml/badge.svg)](https://github.com/unif-design/react-native-hms-scan/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/@unif/react-native-hms-scan.svg?color=blue)](https://github.com/unif-design/react-native-hms-scan/blob/main/LICENSE)
[![Docs](https://img.shields.io/badge/docs-unif--design.github.io-orange.svg)](https://unif-design.github.io/react-native-hms-scan/)

华为 **HMS 统一扫码**（HUAWEI Scan Kit）的 React Native 封装（新架构）：定制视图扫码（成品页 `<Scanner>` / headless `<HmsScanView>`）+ 图片识别（`decodeImage`）。Android 用 Scan SDK-Plus（内置引擎，**不依赖 HMS Core APK**，非华为机型可用），iOS 用 ScanKitFrameWork；两端均无需 AppGallery Connect / API Key。

> 📖 **完整文档**（安装 · 平台配置 · API · 平台差异 · 故障排查）：
> **https://unif-design.github.io/react-native-hms-scan/**

## 安装

```sh
yarn add @unif/react-native-hms-scan react-native-svg
cd ios && pod install
```

本库为新架构（TurboModule + Fabric）库，宿主需开启新架构。Android 权限、iOS `ScanKitFrameWork`（arm64-only 静态库，模拟器排除 / 建议真机）等见[文档站 · 安装](https://unif-design.github.io/react-native-hms-scan/docs/getting-started/installation)。

## 用法

```tsx
import { Scanner, type ScanResult, type ScanProduct } from '@unif/react-native-hms-scan';

function ScanScreen({ navigation }) {
  return (
    <Scanner
      title="扫一扫"
      onClose={() => navigation.goBack()}
      resolveProduct={async (r: ScanResult): Promise<ScanProduct | null> => {
        const p = await api.lookupByBarcode(r.value);
        return p
          ? { name: p.name, brand: p.brand, price: `¥${p.price}`, barcode: r.value }
          : null;
      }}
      onConfirm={(product, result) => navigation.navigate('Order', { product })}
    />
  );
}
```

headless `<HmsScanView>`、图片识别 `decodeImage`、权限、平台差异 —— 见[文档站](https://unif-design.github.io/react-native-hms-scan/)。

## 许可

MIT © unif-design
