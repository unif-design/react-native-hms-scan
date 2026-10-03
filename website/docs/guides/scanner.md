---
sidebar_position: 1
title: 成品扫一扫页
---

# 组合扫码页

Scanner 已组合实时扫码、权限和图片解码，默认选用每批首项。

```tsx
import { Scanner } from '@unif/react-native-hms-scan';

<Scanner
  formats={['QR_CODE', 'EAN_13']}
  pickImage={async () => {
    const file = await chooseLocalImage();
    if (!file) return null;
    return {
      uri: file.uri,
      onSourceReleased: () => file.release(),
    };
  }}
  onConfirm={(result) => {
    // 结果已交付；这里可导航、查询客户或查询商品。
    handleValue(result.value);
  }}
  onClose={() => navigation.goBack()}
  onError={(error) => reportError(error)}
/>;
```

`chooseLocalImage`、`file.release` 与业务回调是应用提供的能力。选图入口返回可读 file URI；若该文件由临时媒体能力管理，在 onSourceReleased 中交回该能力。Scanner 不删除文件。

## 状态与归属

- 进入时读权限，按明确扫码意图申请；授权后开始预览。
- 相机识别与相册解码竞争同一轮结果采用权，不会覆盖彼此结果。
- 识别成功暂停并展示原文与码制；点“选用”最多交付一次。
- autoConfirm 直接走相同交付，不表示业务提交确认。
- 取消选图恢复扫描；真实空结果展示未识别；错误另行展示并通过 onError 通知。
- 重扫结束原结果采用；关闭/卸载停止设备和结果采用。
- 关闭期间仍在原生读取的图片等待实际结束后归还；迟到选择直接归还，不再读取。

## 配置、主题和安全区

有效 formats 变化开始新的扫描，仍在进行的读取先收尾。标题、提示、主题、字号和回调变化不重启。业务目标变化时由消费方卸载旧 Scanner。

外层 ThemeProvider 的颜色和字号自动继承。topInset/bottomInset 可显式指定；省略时使用所在窗口 SafeAreaProvider，无提供方时由局部 Provider 测量实际值。

完整输入与默认值见 [Scanner API](/docs/api/scanner)。
