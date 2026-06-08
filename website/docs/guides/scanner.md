---
sidebar_position: 1
title: 成品扫一扫页
description: "用 <Scanner> 快速接入完整扫码页：title / onClose / resolveProduct（返回 null=未识别）/ onConfirm / pickImage（传了才显示相册）/ showTorch / formats / 安全区 topInset·bottomInset。自带状态机 + 权限流 + 主题，一次扫一个。"
---

# 成品扫一扫页

`<Scanner>` 是开箱即用的成品扫码界面(聚焦款,浅色)。底层用 `<HmsScanView>` 出相机画面,取景框 / 工具栏 / 结果卡全用 [`@unif/react-native-design`](https://www.npmjs.com/package/@unif/react-native-design) 的主题令牌与组件绘制。

它**自带 `ThemeProvider` + `ToastHost` + 权限流 + 状态机**,可直接作为一个路由整屏接入;放进宿主已有的 `ThemeProvider` 里也兼容。

:::info 何时用 `<Scanner>` vs `<HmsScanView>`
要现成的扫一扫页 → 用 `<Scanner>`(本页)。要完全自绘 UI(自定义取景框 / 工具栏布局)→ 用底层 [`<HmsScanView>`](/docs/guides/headless)。
:::

---

## 内部状态机 {#state-machine}

```
init → scan（取景）→ detecting（识别中）
                       ↓
                success（浮层确认卡）→ onConfirm → 带回上一级
                       ↓
                  fail（未识别弹层）→ 重扫 → scan
                       ↓
                denied（无权限遮罩）→ 去系统设置
```

`<Scanner>` 挂载时**自动请求相机权限**:已授权直接进入取景;永久拒绝则展示引导去系统设置的遮罩(`denied`)。**一次扫一个** —— 扫到 `results[0]` 即进入 `detecting`,确定或重扫后才复位回 `scan`(内部 `handlingRef` 防重入)。

---

## 商品解析 `resolveProduct` {#resolve-product}

扫到条码后,`<Scanner>` 把 `ScanResult` 交给 `resolveProduct`,由你解析成商品信息(用于浮层确认卡):

```tsx
<Scanner
  resolveProduct={async (result) => {
    const product = await api.lookupByBarcode(result.value);
    if (!product) return null; // null = 未识别 → 进入 fail 重扫弹层
    return {
      name: product.name,        // 仅 name 必填
      brand: product.brand,
      price: `¥${product.price}`,
      spec: product.spec,
      stockShort: product.stockText,
    };
  }}
/>
```

- 返回 `null` / `undefined` **或抛错**,均视为「未识别」,进入 `fail` 重扫弹层。
- **不传 `resolveProduct`** 时,默认以扫到的原文(`result.value`)作为商品名。
- 返回的 `ScanProduct` 中只有 `name` 必填,其余(`brand` / `price` / `spec` / `stockShort` / `brandChar` / `priceCaption` 等)可缺省;`barcode` 缺省时自动取扫到的 `value`。完整字段见 [API → ScanProduct](/docs/api/types)。

---

## 确认回调 `onConfirm` {#on-confirm}

用户在浮层确认卡点「确定」时触发,签名 `(product, result)`:

```tsx
<Scanner
  onConfirm={(product, result) => {
    navigation.navigate('Order', {
      barcode: result.value, // 扫码原始内容
      product,               // resolveProduct 返回的商品
    });
  }}
/>
```

> 点确定后 `<Scanner>` 会 toast「已确定」并自动复位回取景态,宿主通常在 `onConfirm` 里导航离开本页。

---

## 相册扫码 `pickImage` {#pick-image}

**库不内置图片选择器**(遵循 RN 惯例):**传了 `pickImage` 才显示「相册」按钮**,不传则隐藏。宿主用自己的选择器选图,返回本地 `uri`(取消返回 `null`),`<Scanner>` 内部对它调 `decodeImage`:

```tsx
import { launchImageLibrary } from 'react-native-image-picker';

<Scanner
  pickImage={async () => {
    const res = await launchImageLibrary({ mediaType: 'photo' });
    return res.assets?.[0]?.uri ?? null; // 取消返回 null
  }}
/>
```

```tsx
// ❌ Incorrect：没传 pickImage 却期望出现相册按钮
<Scanner onConfirm={...} /> // 工具栏不会有"相册"

// ✅ Correct：传了 pickImage，相册按钮才显示
<Scanner onConfirm={...} pickImage={async () => /* 选图返回本地 uri */} />
```

> 相册识图走 `decodeImage`,它**只接受本地 uri、不下载远程 URL**。`react-native-image-picker` 返回的就是本地路径,可直接用;细节见[图片识别](/docs/guides/decode-image)。

---

## 手电筒 `showTorch` {#show-torch}

底部工具栏默认显示手电筒按钮(`showTorch` 默认 `true`),手电状态由库内自管:

- **Android** —— 可编程控制,稳定可用。
- **iOS** —— HMS 未提供公开手电 API,本库通过 `AVCaptureDevice` **尽力而为**,不保证点亮。

不想在 iOS 上呈现一个可能无效的按钮,可关掉:

```tsx
import { Platform } from 'react-native';

<Scanner showTorch={Platform.OS === 'android'} />
```

详见[平台差异 → 手电筒](/docs/platform-differences#torch)。

---

## 安全区 `topInset` / `bottomInset` {#insets}

`<Scanner>` 默认 `topInset=54` / `bottomInset=34`。用 `react-native-safe-area-context` 时,把 `insets.top/bottom` 传入更精准:

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

## 限定码制 `formats` {#formats}

`formats` 限定识别哪些码制,**不传 = 识别全部 14 种**:

```tsx
<Scanner
  formats={['QR_CODE', 'EAN_13', 'EAN_8']}
  // ...
/>
```

> 限定到业务真正需要的码制(如只扫商品条码),能减少误识、提升识别速度。全部码制清单见 [API → BarcodeFormat](/docs/api/types)。

---

## 自定义提示文案 `hintText` {#hint-text}

取景态默认提示「将条码 / 二维码放入框内,自动扫描」,可用 `hintText` 覆盖:

```tsx
<Scanner hintText="对准商品上的条形码" />
```

---

## 相关

- [API 参考 → Scanner](/docs/api/scanner) —— 完整 props 表
- [指南 → 底层 headless 组件](/docs/guides/headless) —— 需要自定义 UI 时用 `<HmsScanView>`
- [指南 → 图片识别](/docs/guides/decode-image) —— `decodeImage` 单独使用
- [指南 → 权限处理](/docs/guides/permissions) —— `<Scanner>` 自动处理;手动场景的 API
