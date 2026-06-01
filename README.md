# @unif/react-native-hms-scan

华为 **HMS 统一扫码服务**（HUAWEI Scan Kit）的 React Native 封装，新架构（TurboModule + Fabric）。聚焦两件事：

- **定制视图扫码** —— 底层 headless `<HmsScanView>` 相机组件，外加按设计稿做好的成品 `<Scanner>` 扫一扫页（聚焦款，浅色）。
- **图片识别** —— `decodeImage(uri)` 从本地图片解码条码 / 二维码。

> Android 用 **Scan SDK-Plus**（内置引擎，**不依赖设备安装 HMS Core APK**，非华为机型可用）；iOS 用 CocoaPods 的 **ScanKitFrameWork**。两端**都不需要 AppGallery Connect / agconnect 配置 / API Key**。

## 安装

```sh
yarn add @unif/react-native-hms-scan react-native-svg
cd ios && pod install
```

`react-native-svg` 是 peer 依赖（`<Scanner>` 的图标用它绘制）。本库为 New Architecture 库，宿主需开启新架构。

### Android

库的 gradle 已自带华为 maven 仓库与 `com.huawei.hms:scanplus` 依赖，**无需改宿主 gradle**。只需在宿主 `AndroidManifest.xml` 声明权限：

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<!-- 仅当用 decodeImage 解相册图时需要 -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />          <!-- API 33+ -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />
```

- minSdkVersion ≥ 24。
- **不需要** `agconnect-services.json` / agconnect 插件 / API Key。

### iOS

`pod install` 会自动拉取 `ScanKitFrameWork`。在宿主 `Info.plist` 加：

```xml
<key>NSCameraUsageDescription</key>
<string>用于扫描商品条码与门店二维码</string>
<!-- 仅当用 decodeImage 解相册图时需要 -->
<key>NSPhotoLibraryUsageDescription</key>
<string>用于从相册选取图片识别条码</string>
```

- 最低 iOS 版本随宿主 RN 工程。
- `ScanKitFrameWork` 是 **arm64-only 静态库**：podspec 已对 Apple 芯片模拟器排掉 arm64（模拟器走 x86_64），**真机 arm64 不受影响**；建议在真机调试扫码。
- **不需要** AppGallery Connect / API Key。

## 用法

### 1) 成品扫一扫页 `<Scanner>`（推荐）

```tsx
import { Scanner, type ScanResult, type ScanProduct } from '@unif/react-native-hms-scan';

function ScanScreen({ navigation }) {
  return (
    <Scanner
      title="扫一扫"
      onClose={() => navigation.goBack()}
      // 扫到条码后解析商品（你的业务：查接口/本地库）。返回 null = 未识别。
      resolveProduct={async (r: ScanResult): Promise<ScanProduct | null> => {
        const p = await api.lookupByBarcode(r.value);
        return p && {
          name: p.name, brand: p.brand, price: `¥${p.price}`,
          spec: p.spec, stockShort: p.stockText, barcode: r.value,
        };
      }}
      // 点"确认"：把结果带回上一级
      onConfirm={(product, result) => {
        navigation.navigate('Order', { barcode: result.value, product });
      }}
      // 点"相册"：用你自己的图片选择器返回本地 uri
      pickImage={async () => {
        const res = await launchImageLibrary({ mediaType: 'photo' });
        return res.assets?.[0]?.uri ?? null;
      }}
    />
  );
}
```

`<Scanner>` 内部状态：取景 → 识别中 → 识别成功（浮层确认卡）/ 未识别（重试弹层）/ 无权限（去设置）。单次扫一个，确认后带回上一级。手电筒 / 相册在底部工具栏。

> 安全区：默认 `topInset=54 / bottomInset=34`。若用 `react-native-safe-area-context`，把 `insets.top/bottom` 传进来更精准。

### 2) 底层 headless 组件 `<HmsScanView>`

完全自定义 UI 时，只用相机预览 + 结果事件，自己画取景框：

```tsx
import { HmsScanView, type ScanResult } from '@unif/react-native-hms-scan';

<HmsScanView
  style={{ flex: 1 }}
  formats={['QR_CODE', 'EAN_13']}   // 不传 = 全部码制
  torch={torchOn}                   // Android 可控；iOS 为尽力而为
  paused={paused}                   // 命中后想停在结果时置 true
  onScanResult={(results: ScanResult[]) => {
    const code = results[0]?.value;
  }}
  onScanError={(e) => console.warn(e.code, e.message)}
/>
```

### 3) 图片识别 `decodeImage`

```tsx
import { decodeImage } from '@unif/react-native-hms-scan';

const results = await decodeImage('file:///path/photo.jpg', { formats: ['QR_CODE'] });
// results: ScanResult[]（可能为空）。只吃本地 uri，远程图请先下载。
```

### 4) 相机权限

```tsx
import { getCameraPermissionStatus, requestCameraPermission } from '@unif/react-native-hms-scan';
const status = await requestCameraPermission(); // 'granted' | 'denied' | 'blocked' | 'undetermined'
```

## 平台差异（务必知悉）

| 能力 | Android (`RemoteView`) | iOS (`HmsCustomScanViewController`) |
| --- | --- | --- |
| 手电筒 `torch` | ✅ 可编程控制 | ⚠️ HMS 无公开手电 API；本库走 `AVCaptureDevice` **尽力而为**，不保证 |
| 变焦 | ❌ 仅内部自动 | ❌ 仅内部自动 |
| 暗光提示 `onTorchStatus.available` | ✅ 上报 | ❌ 不上报 |

## 测试（Jest）

消费者在测试里可用内置 mock 替换本库（避免加载原生）：

```ts
jest.mock('@unif/react-native-hms-scan', () =>
  require('@unif/react-native-hms-scan/mock')
);
// decodeImage / 权限方法是 jest.fn；<HmsScanView>/<Scanner> 渲染为 null。
```

## 类型一览

`BarcodeFormat`（QR_CODE / EAN_13 / … / UNKNOWN）、`BarcodeContentType`、`ScanResult { value, format, contentType?, cornerPoints? }`、`ScanProduct`、`CameraPermissionStatus`、`HmsScanError`。

## 许可

MIT © unif-design
