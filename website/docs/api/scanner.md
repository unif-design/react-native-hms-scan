---
sidebar_position: 1
title: Scanner
description: "<Scanner> 成品扫一扫页完整 props 参考：title / formats / hintText / topInset / bottomInset / showTorch / onClose / resolveProduct / onConfirm / autoConfirm / pickImage，以及回调用到的 ScanResult / ScanProduct 类型。自带状态机 + 权限流 + 主题。"
---

# Scanner

成品「扫一扫」界面（聚焦款，浅色）。底层使用 [`<HmsScanView>`](/docs/api/hms-scan-view) 出相机画面，取景框 / 工具栏 / 结果卡全用 `@unif/react-native-design` 的主题令牌与组件绘制。**自带 `ThemeProvider` + `ToastHost` + 权限流**，可直接整屏接入。

```tsx
import { Scanner } from '@unif/react-native-hms-scan';
```

---

## 签名

```tsx
function Scanner(props: ScannerProps): JSX.Element
```

---

## Props {#props}

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `title` | `string` | `'扫一扫'` | 顶栏标题 |
| `formats` | `BarcodeFormat[]` | — | 限定识别码制；不传 = 全部（[14 种](/docs/api/types#barcode-format)） |
| `hintText` | `string` | `'将条码 / 二维码放入框内，自动扫描'` | 取景态提示文案 |
| `topInset` | `number` | `54` | 顶部安全区高度（px）。用 `react-native-safe-area-context` 时传 `insets.top` |
| `bottomInset` | `number` | `34` | 底部安全区高度（px）。用 `react-native-safe-area-context` 时传 `insets.bottom` |
| `showTorch` | `boolean` | `true` | 是否显示手电筒按钮。手电由库内自管：Android 可编程控制，**iOS 为 best-effort**（见[平台差异](/docs/platform-differences#torch)），可在 iOS 传 `false` 隐藏 |
| `onClose` | `() => void` | — | 返回按钮回调（退出扫码页；按钮在底部工具栏，与手电筒并排） |
| `resolveProduct` | `(result: ScanResult) => ScanProduct \| null \| undefined \| Promise<ScanProduct \| null \| undefined>` | — | 扫到条码后由宿主解析商品信息（用于浮层确认卡）。返回 `null` / `undefined` **或抛错** = 未识别 → 进入 fail 重扫层。不传则以 `result.value` 作为商品名 |
| `onConfirm` | `(product: ScanProduct, result: ScanResult) => void` | — | 用户点"确定"时回调（宿主通常在此导航返回）。`autoConfirm` 为真时由库自动触发 |
| `autoConfirm` | `boolean` | `false` | 扫到并解析成功后**不显示结果卡**，直接触发 `onConfirm(product, result)`。适合"扫到即用、无需二次确认"。回调后相机暂停、不自动重扫（宿主通常在 `onConfirm` 里导航离开；再扫由宿主控制）。未识别（`resolveProduct` 返回 `null` / 抛错）仍走 fail 重扫，不会误触发 |
| `pickImage` | `() => Promise<string \| null>` | — | 点"相册"：宿主用自己的图片选择器选图并返回本地 uri（取消返回 `null`）。**库不内置图片选择器：传了才显示相册按钮，不传则隐藏** |

:::note 返回 / 手电 / 相册按钮的显隐
工具栏在取景态显示，只要 `showTorch` 为真、传了 `pickImage`、**或**传了 `onClose` 任一即出现：返回按钮在传了 `onClose` 时显示，手电按钮受 `showTorch` 控制，相册按钮仅在传了 `pickImage` 时显示。`pickImage` 返回的本地 uri 会交给 `decodeImage` 识别（受同样的 [URI 规则](/docs/api/functions#accepted-uri) 约束）。
:::

---

## 回调用到的类型 {#types}

### ScanResult {#scan-result}

`resolveProduct` / `onConfirm` 收到的扫码结果。完整定义见 [类型 → ScanResult](/docs/api/types#scan-result)。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `value` | `string` | ✅ | 原始解码文本 |
| `format` | `BarcodeFormat` | ✅ | 码制 |
| `contentType` | `BarcodeContentType` | — | 内容语义类型（可能缺省） |
| `cornerPoints` | `ScanCornerPoint[]` | — | 条码四角点（可能缺省） |

### ScanProduct {#scan-product}

`resolveProduct` 返回、用于浮层确认卡展示的商品信息。仅 `name` 必填。完整定义见 [类型 → ScanProduct](/docs/api/types#scan-product)。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | `string` | ✅ | 商品名 |
| `brand` | `string` | — | 品牌 |
| `brandChar` | `string` | — | 字母牌字符；缺省取 `brand` / `name` 首字 |
| `barcode` | `string` | — | 条码；缺省取扫到的 `value` |
| `spec` | `string` | — | 规格 |
| `stockShort` | `string` | — | 库存短描述 |
| `price` | `string` | — | 价格展示串 |
| `priceCaption` | `string` | — | 价格副标题，默认 "建议零售" |

---

## 示例

```tsx
import { Scanner, type ScanResult, type ScanProduct } from '@unif/react-native-hms-scan';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function ScanScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <Scanner
      title="扫一扫"
      topInset={insets.top}
      bottomInset={insets.bottom}
      formats={['QR_CODE', 'EAN_13']}
      onClose={() => navigation.goBack()}
      resolveProduct={async (r: ScanResult): Promise<ScanProduct | null> => {
        const p = await api.lookupByBarcode(r.value);
        return p ? { name: p.name, price: `¥${p.price}` } : null;
      }}
      onConfirm={(product, result) => {
        navigation.navigate('Order', { barcode: result.value, product });
      }}
      pickImage={async () => {
        const res = await launchImageLibrary({ mediaType: 'photo' });
        return res.assets?.[0]?.uri ?? null;
      }}
    />
  );
}
```

---

## 注意事项

- 挂载时**自动请求相机权限**：已授权直接进入取景；永久拒绝（`blocked`）展示引导去系统设置的遮罩。无需自行写权限流。
- 内部状态机:`init → scan → detecting → success / fail / denied / done`,**一次扫一个**。手动确认或重扫后回 `scan`;`autoConfirm` 成功后进 `done`,相机保持暂停且不自动重扫。
- `autoConfirm` 进 `done` 的前提是 **`onConfirm` 正常返回**:它与 `resolveProduct` 在同一个 `try` 里调用,`onConfirm` 同步抛错会被收成 fail 重扫层,不会到达 `done`。宿主导航可能抛错时，请在 `onConfirm` 内部自行 try/catch。
- `resolveProduct` **抛错与返回 `null` / `undefined` 效果相同**，均进入 fail 重扫层。
- 自带 `ThemeProvider`；放进宿主已有的 `ThemeProvider` 里也兼容（嵌套不报错）。
- `@unif/react-native-design` 是 peer 依赖，`<Scanner>` 的 UI 依赖它（及其链上的 `react-native-reanimated` / `react-native-gesture-handler`）。

---

## 平台兼容性

| 平台 | 支持 | 备注 |
| --- | --- | --- |
| iOS（真机） | ✅ | 官方 `ScanKitFrameWork 1.1.2.305` CocoaPod；手电 best-effort |
| iOS Simulator | ❌ | 原生目标不支持；无硬件 JS 逻辑使用随包 Jest mock（见[平台差异](/docs/platform-differences)） |
| Android | ✅ | 全功能支持 |
| Web | ❌ | — |

---

## 相关

- [指南 → 成品扫一扫页](/docs/guides/scanner) — 使用场景与配置示例
- [API 参考 → HmsScanView](/docs/api/hms-scan-view) — 底层 headless 组件
- [API 参考 → 类型](/docs/api/types) — `ScanResult` / `ScanProduct` / `BarcodeFormat`
- [平台差异](/docs/platform-differences) — 手电筒 / 真机限制
