---
sidebar_position: 7
title: 测试(Mock)
description: "用官方 mock 在 Jest 中替换 @unif/react-native-hms-scan，避免加载 TurboModule / Fabric 组件：require('@unif/react-native-hms-scan/mock') 后 decodeImage→[]、权限→granted、<HmsScanView>/<Scanner>→null；纯函数 coerceFormat/coerceContentType/formatsToCsv 与类型 / HmsScanError 保留真实实现。可按需覆盖单次返回。"
---

# 测试(Mock)

本库依赖 `HmsScan` TurboModule 与 `HmsScanView` Fabric 组件，Jest 环境无法直接加载原生模块。库内置一份官方 mock，消费者在测试里用它替换本库：

```ts
jest.mock('@unif/react-native-hms-scan', () =>
  require('@unif/react-native-hms-scan/mock')
);
```

---

## mock 后的行为 {#behavior}

| 导出 | mock 行为 |
| --- | --- |
| `decodeImage` | `jest.fn`，默认 resolve **`[]`** |
| `getCameraPermissionStatus` | `jest.fn`，默认 resolve **`'granted'`** |
| `requestCameraPermission` | `jest.fn`，默认 resolve **`'granted'`** |
| `<HmsScanView>` | 渲染为 **`null`**（不触碰原生） |
| `<Scanner>` | 渲染为 **`null`**（不触碰原生） |
| `coerceFormat` / `coerceContentType` / `formatsToCsv` | **保留真实实现**（纯函数，不碰原生） |
| 类型 / 常量 / `HmsScanError` / `ALL_BARCODE_FORMATS` | **保留真实实现**（从 `./types` 原样导出） |

:::note 纯函数与类型不被打桩
码制工具（`coerceFormat` / `coerceContentType` / `formatsToCsv`）以及所有类型、`HmsScanError`、`ALL_BARCODE_FORMATS` 在 mock 中是**真实实现**——它们不触碰原生，可在测试里直接断言其真实行为。被打桩的只有触碰原生的部分（`decodeImage`、两个权限函数、两个组件）。
:::

---

## 覆盖单次返回 {#override}

默认值不够时，用 `jest.fn` 的 `mockResolvedValueOnce` 等覆盖：

```ts
import { decodeImage, getCameraPermissionStatus } from '@unif/react-native-hms-scan';

jest.mock('@unif/react-native-hms-scan', () =>
  require('@unif/react-native-hms-scan/mock')
);

// 让 decodeImage 返回一个模拟命中
(decodeImage as jest.Mock).mockResolvedValueOnce([
  { value: '6901028018999', format: 'EAN_13' },
]);

// 让权限查询返回 blocked
(getCameraPermissionStatus as jest.Mock).mockResolvedValueOnce('blocked');
```

---

## 完整示例 {#example}

```ts
import { decodeImage, requestCameraPermission } from '@unif/react-native-hms-scan';

jest.mock('@unif/react-native-hms-scan', () =>
  require('@unif/react-native-hms-scan/mock')
);

describe('扫码流程', () => {
  it('图片识别返回结果', async () => {
    (decodeImage as jest.Mock).mockResolvedValueOnce([
      { value: 'https://example.com', format: 'QR_CODE' },
    ]);

    const results = await decodeImage('file:///photo.jpg');
    expect(results).toHaveLength(1);
    expect(results[0].value).toBe('https://example.com');
  });

  it('图里没码（默认空数组）', async () => {
    const results = await decodeImage('file:///blank.jpg');
    expect(results).toEqual([]); // mock 默认 resolve []
  });

  it('权限被永久拒绝', async () => {
    (requestCameraPermission as jest.Mock).mockResolvedValueOnce('blocked');

    const status = await requestCameraPermission();
    expect(status).toBe('blocked');
  });
});
```

:::tip 不要在模拟器里测真实扫码
iOS 扫码仅真机、相机能力依赖硬件。逻辑层（识图 / 权限分支 / 结果处理）用本页的 `jest.mock` 方案在无硬件环境跑通，相机本身留到真机手测。详见[常见问题](/docs/troubleshooting)。
:::

---

## 相关

- [API 参考 → 函数](/docs/api/functions) — `decodeImage` / 权限函数 / 码制工具签名
- [API 参考 → 类型](/docs/api/types) — `ScanResult` / `CameraPermissionStatus` / `HmsScanError`
- [常见问题](/docs/troubleshooting) — iOS 真机限制与排障
