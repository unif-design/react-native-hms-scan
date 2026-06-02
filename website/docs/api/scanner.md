---
sidebar_position: 1
title: Scanner
description: "<Scanner> 成品扫一扫页完整 props 参考——title、formats、topInset、resolveProduct、onConfirm、pickImage 等。"
---

# Scanner

成品扫一扫界面（聚焦款，浅色）。底层使用 `<HmsScanView>`，取景框 / 工具栏 / 结果卡全用 `@unif/react-native-design` 绘制。自带 `ThemeProvider` + `ToastHost`。

```tsx
import { Scanner } from '@unif/react-native-hms-scan';
```

---

## 签名

```tsx
function Scanner(props: ScannerProps): JSX.Element
```

---

## Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `title` | `string` | `'扫一扫'` | 顶栏标题 |
| `formats` | `BarcodeFormat[]` | — | 限定识别码制；不传 = 全部 |
| `hintText` | `string` | `'将条码 / 二维码放入框内，自动扫描'` | 取景态提示文案 |
| `topInset` | `number` | `54` | 顶部安全区高度（px）。使用 `react-native-safe-area-context` 时传 `insets.top` |
| `bottomInset` | `number` | `34` | 底部安全区高度（px）。使用 `react-native-safe-area-context` 时传 `insets.bottom` |
| `onClose` | `() => void` | — | 左上角关闭按钮回调 |
| `resolveProduct` | `(result: ScanResult) => ScanProduct \| null \| undefined \| Promise<...>` | — | 扫到条码后由宿主解析商品信息（用于浮层确认卡）。返回 `null`/`undefined` 或抛错 = 未识别 → fail 状态。不传则以 `result.value` 作为商品名 |
| `onConfirm` | `(product: ScanProduct, result: ScanResult) => void` | — | 用户点"确认"时回调 |
| `pickImage` | `() => Promise<string \| null>` | — | 点"相册"：宿主返回本地 uri，取消返回 `null`。不传则相册按钮不可用 |

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

- `<Scanner>` 挂载时自动请求相机权限；已授权直接进入取景；永久拒绝（`blocked`）则展示引导遮罩。
- 内部状态机：`init → scan → detecting → success / fail / denied`，单次扫一个。
- `resolveProduct` 抛错与返回 `null` / `undefined` 效果相同，均进入 fail 重试弹层。
- `<Scanner>` 自带 `ThemeProvider`，放进宿主已有的 `ThemeProvider` 里也兼容（嵌套不报错）。

---

## 平台兼容性

| 平台 | 支持 |
| --- | --- |
| iOS（真机） | ✅ |
| Android | ✅ |
| Web | ❌ |

---

## 相关

- [指南 → 成品扫一扫页](/docs/guides/scanner) — 使用场景与配置示例
- [API 参考 → HmsScanView](/docs/api/hms-scan-view) — 底层 headless 组件
- [API 参考 → 类型](/docs/api/types) — `ScanResult` / `ScanProduct` / `BarcodeFormat`
