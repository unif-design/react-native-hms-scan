---
sidebar_position: 7
title: 测试(Mock)
---

# 测试

消费者可使用包提供的 mock，公共类型和错误类与正式入口一致。

```ts
jest.mock('@unif/react-native-hms-scan', () =>
  require('@unif/react-native-hms-scan/mock')
);

import { decodeImage, ScanError } from '@unif/react-native-hms-scan';

jest.mocked(decodeImage).mockResolvedValueOnce([
  { value: '00123', format: 'EAN_13' },
]);
await decodeImage({ uri: 'file:///tmp/photo.jpg' });

jest.mocked(decodeImage).mockRejectedValueOnce(
  new ScanError({ reason: 'image_unavailable', message: '文件不可读' })
);
```

decodeImage 默认返回 []，两个权限函数默认 granted，组件返回 null。Mock 不模拟相机硬件、真实权限或文件可读性。结果转换和格式映射是库内部实现，不通过 mock 导出。

## 本库验证

```sh
yarn jest src/__tests__/capabilities.test.tsx src/__tests__/Scanner.test.tsx --runInBand --watchman=false
yarn typecheck
yarn lint
```

修改公共结果、异步采用和原生协议时覆盖实际 Scanner、example、mock、Web 入口与 Fabric Codegen。完整 CI 包含集成检查、库打包和原生 example 构建。真机上的扫码、图库读取、手电和生命周期分别验收；Jest 不能代替设备证据。
