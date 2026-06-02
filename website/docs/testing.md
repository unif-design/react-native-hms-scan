---
sidebar_position: 7
title: 测试(Mock)
description: "在 Jest 测试环境中 mock @unif/react-native-hms-scan，避免加载 native 模块。"
---

# 测试(Mock)

本库依赖 `NativeHmsScan` TurboModule，Jest 环境无法直接加载原生模块。消费者在测试里用内置 mock 替换本库：

```ts
jest.mock('@unif/react-native-hms-scan', () =>
  require('@unif/react-native-hms-scan/mock')
);
```

mock 后：
- `decodeImage` / `getCameraPermissionStatus` / `requestCameraPermission` 是 `jest.fn`
- `<HmsScanView>` / `<Scanner>` 渲染为 `null`

---

## 覆盖单次返回

```ts
import { decodeImage, getCameraPermissionStatus } from '@unif/react-native-hms-scan';

jest.mock('@unif/react-native-hms-scan', () =>
  require('@unif/react-native-hms-scan/mock')
);

// 让 decodeImage 返回一个模拟结果
(decodeImage as jest.Mock).mockResolvedValueOnce([
  { value: '6901028018999', format: 'EAN_13' },
]);

// 让权限查询返回 granted
(getCameraPermissionStatus as jest.Mock).mockResolvedValueOnce('granted');
```

---

## 完整示例

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

  it('权限被永久拒绝', async () => {
    (requestCameraPermission as jest.Mock).mockResolvedValueOnce('blocked');

    const status = await requestCameraPermission();
    expect(status).toBe('blocked');
  });
});
```
