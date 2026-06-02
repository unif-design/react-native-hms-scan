---
sidebar_position: 1
title: 成品扫一扫页
description: 使用 <Scanner> 快速接入完整扫码页——resolveProduct、onConfirm、pickImage、安全区配置。
---

# 成品扫一扫页

`<Scanner>` 是开箱即用的成品扫码界面（聚焦款，浅色）。底层使用 `<HmsScanView>` 提供相机画面，取景框 / 工具栏 / 结果卡全用 `@unif/react-native-design` 的主题令牌与组件绘制。

自带 `ThemeProvider` + `ToastHost`，可直接整屏接入；放进宿主已有的 `ThemeProvider` 里也兼容。

---

## 内部状态机

```
init → scan（取景）→ detecting（识别中）
                    ↓
             success（浮层确认卡）→ onConfirm → 带回上一级
                    ↓
               fail（未识别弹层）→ 重试 → scan
                    ↓
             denied（无权限遮罩）→ 去设置
```

`<Scanner>` 挂载时自动请求相机权限；已授权直接进入取景；永久拒绝则展示引导去设置的遮罩。

---

## 商品解析 `resolveProduct`

扫到条码后，`<Scanner>` 调用 `resolveProduct` 将扫码结果解析为商品信息，用于浮层确认卡展示：

```tsx
<Scanner
  resolveProduct={async (result) => {
    const product = await api.lookupByBarcode(result.value);
    if (!product) return null; // null = 未识别，进入 fail 状态
    return {
      name: product.name,
      brand: product.brand,
      price: `¥${product.price}`,
      spec: product.spec,
      stockShort: product.stockText,
      barcode: result.value,
    };
  }}
/>
```

- 返回 `null` / `undefined` 或抛错均视为"未识别"，进入 fail 重试弹层。
- 不传 `resolveProduct` 时，默认以扫到的原文（`result.value`）作为商品名。

---

## 确认回调 `onConfirm`

用户在浮层确认卡点击"确认"时触发：

```tsx
<Scanner
  onConfirm={(product, result) => {
    navigation.navigate('Order', {
      barcode: result.value,
      product,
    });
  }}
/>
```

---

## 相册扫码 `pickImage`

传入 `pickImage` 后底部工具栏的"相册"按钮变为可用。宿主用自己的图片选择器选图，返回本地 `uri`（取消返回 `null`）：

```tsx
import { launchImageLibrary } from 'react-native-image-picker';

<Scanner
  pickImage={async () => {
    const res = await launchImageLibrary({ mediaType: 'photo' });
    return res.assets?.[0]?.uri ?? null;
  }}
/>
```

不传 `pickImage` 则相册按钮不可用。

---

## 安全区

`<Scanner>` 默认 `topInset=54 / bottomInset=34`。如果使用 `react-native-safe-area-context`，把 `insets.top/bottom` 传入更精准：

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function ScanScreen() {
  const insets = useSafeAreaInsets();
  return (
    <Scanner
      topInset={insets.top}
      bottomInset={insets.bottom}
      onClose={() => navigation.goBack()}
      // ...
    />
  );
}
```

---

## 限定码制

`formats` 限定识别哪些码制，不传则识别全部：

```tsx
<Scanner
  formats={['QR_CODE', 'EAN_13', 'EAN_8']}
  // ...
/>
```

---

## 相关

- [API 参考 → Scanner](/docs/api/scanner) — 完整 props 表
- [指南 → 底层 headless 组件](/docs/guides/headless) — 需要自定义 UI 时使用 `<HmsScanView>`
- [指南 → 图片识别](/docs/guides/decode-image) — `decodeImage` 单独使用
