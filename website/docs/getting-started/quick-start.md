---
sidebar_position: 2
title: 快速上手
description: "用 <Scanner> 5 分钟跑通第一个扫码页：丢一个 <Scanner> 进路由，传 onClose / resolveProduct / onConfirm，扫到条码弹浮层确认卡，确认带回上一级。pickImage 可选（相册）。"
---

# 快速上手

5 分钟跑通第一个扫码页:把成品 `<Scanner>` 丢进一个路由,传 `onClose` / `resolveProduct` / `onConfirm`,它自带取景 → 识别 → 确认的完整流程。

:::warning iOS 扫码仅真机
扫码依赖原生相机,**iOS 模拟器 / Android 模拟器 / Web 都跑不起来**(属预期行为)。请在真机上验证。先完成[安装](/docs/getting-started/installation)(peerDeps + iOS `pod install` + `NSCameraUsageDescription`)再运行本例。
:::

---

## 最小可跑示例

```tsx
import { Scanner, type ScanResult, type ScanProduct } from '@unif/react-native-hms-scan';

function ScanScreen({ navigation }) {
  return (
    <Scanner
      title="扫一扫"                                    // ① 顶栏标题（默认 "扫一扫"）
      onClose={() => navigation.goBack()}              // ② 左上角关闭

      // ③ 扫到条码后由你解析商品（查接口 / 本地库）。返回 null = 未识别 → 重试弹层
      resolveProduct={async (r: ScanResult): Promise<ScanProduct | null> => {
        const p = await api.lookupByBarcode(r.value);
        return p
          ? { name: p.name, brand: p.brand, price: `¥${p.price}`, spec: p.spec }
          : null;
      }}

      // ④ 用户点"确认"：把结果带回上一级（通常在此导航返回）
      onConfirm={(product, result) => {
        navigation.navigate('Order', { barcode: result.value, product });
      }}

      // ⑤ （可选）点"相册"：用你自己的图片选择器返回本地 uri，取消返回 null
      pickImage={async () => {
        const res = await launchImageLibrary({ mediaType: 'photo' });
        return res.assets?.[0]?.uri ?? null;
      }}
    />
  );
}
```

跑起来后进入该页,把条码 / 二维码放进取景框即自动识别;识别成功弹出浮层确认卡,点「确认」即通过 `onConfirm` 带回上一级。

---

## 逐步讲解

### ① 整屏直接用

`<Scanner>` 是**整屏**组件:它**自带 `ThemeProvider` + `ToastHost` + 权限流 + 状态机**,直接作为一个路由页即可,不必再包主题。(放进宿主已有的 `ThemeProvider` 里也兼容。)

### ② 关闭

`onClose` 在用户点左上角关闭、或在无权限遮罩上点关闭时触发,宿主通常在此 `navigation.goBack()`。

### ③ 解析商品 `resolveProduct`

扫到条码后,`<Scanner>` 把 `ScanResult` 交给你的 `resolveProduct`,你查接口 / 本地库,返回一个 `ScanProduct`(用于浮层确认卡展示):

- 返回 `null` / `undefined` **或抛错** → 视为「未识别」,进入重试弹层。
- **不传 `resolveProduct`** → 默认用扫到的原文(`result.value`)当商品名。

### ④ 确认回调 `onConfirm`

用户在浮层确认卡点「确认」时触发,签名是 `(product, result)`:`product` 是你在 ③ 返回的商品,`result` 是扫码原始结果(`result.value` 是码内容)。

### ⑤ 相册识别 `pickImage`（可选）

**库不内置图片选择器**(遵循 RN 惯例):**传了 `pickImage` 才显示「相册」按钮**,不传则隐藏。你用自己的图片选择器选图、返回本地 `uri`(取消返回 `null`),`<Scanner>` 内部对它调 `decodeImage`。

---

## 内部流程(自动)

`<Scanner>` 内部维护一个状态机,你不用管:

```
取景 → 识别中 →  识别成功（浮层确认卡）→ onConfirm → 带回上一级
              ↘  未识别（重试弹层）→ 重试 → 取景
              ↘  无相机权限（引导去设置遮罩）
```

**一次扫一个**:扫到 `results[0]` 即暂停继续扫,确认或重试后才复位。相机权限在挂载时自动请求,永久拒绝则展示引导去系统设置的遮罩。

---

## 下一步

- [指南 → 成品扫一扫页](/docs/guides/scanner) —— `<Scanner>` 完整配置(安全区、`formats`、手电、相册)
- [指南 → 底层 headless 组件](/docs/guides/headless) —— 需要自定义 UI 时用 `<HmsScanView>`
- [API 参考 → Scanner](/docs/api/scanner) —— Scanner 完整 props 表
