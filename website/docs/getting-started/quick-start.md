---
sidebar_position: 2
title: 快速上手
description: 5 分钟跑通第一个扫码页面——使用 <Scanner> 最小配置完成扫码流程。
---

# 快速上手

本页提供使用 `<Scanner>` 的最小可运行示例，5 分钟跑通第一个扫码页面。

:::warning 真机运行
扫码功能依赖原生相机，**无法在模拟器中预览实际效果**，请在真机上验证。
:::

## 最小示例

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
        return p
          ? {
              name: p.name,
              brand: p.brand,
              price: `¥${p.price}`,
              spec: p.spec,
              stockShort: p.stockText,
              barcode: r.value,
            }
          : null;
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

`<Scanner>` 内部维护完整状态机：**取景 → 识别中 → 识别成功（浮层确认卡）/ 未识别（重试弹层）/ 无权限（去设置）**。

单次扫一个，确认后通过 `onConfirm` 带回上一级。手电筒 / 相册按钮在底部工具栏，权限流程自动处理。

---

## 下一步

- [指南 → 成品扫一扫页](/docs/guides/scanner) — `<Scanner>` 完整配置，含安全区、formats 等
- [API 参考 → Scanner](/docs/api/scanner) — Scanner 完整 props 表
