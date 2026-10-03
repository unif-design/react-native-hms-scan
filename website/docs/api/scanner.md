---
sidebar_position: 1
title: Scanner
---

# Scanner

成品扫码页，组合权限、相机预览、相册解码和结果选用。它展示原始 ScanResult；商品或客户核实由消费场景处理。此组件需要 Android 或 iOS 真机，Web 入口报告 unsupported。

```tsx
import { Scanner } from '@unif/react-native-hms-scan';

<Scanner
  onConfirm={(result) => consumeResult(result.value)}
  onClose={() => navigation.goBack()}
  onError={(error) => reportError(error.reason, error.message)}
/>;
```

## Props

| 属性 | 类型 | 默认值 / 行为 |
| --- | --- | --- |
| title | string | 扫一扫 |
| hintText | string | 将条码 / 二维码放入框内，自动扫描 |
| formats | readonly RequestedScanFormat[] | 无额外过滤 |
| topInset / bottomInset | number | 读取所在 SafeArea 环境；独立使用时局部 Provider 测量 |
| showTorch | boolean | true；按钮采用实际点亮回报 |
| autoConfirm | boolean | false；true 直接交付首项结果 |
| pickImage | `() => Promise<ScannerImage \| null>` | 有回调才显示相册入口 |
| onConfirm | `(result: Readonly<ScanResult>) => void` | 必填；每轮最多交付一次 |
| onClose | () => void | 停止本轮设备和结果采用后通知 |
| onError | `(error: Readonly<ScanFailure>) => void` | 读取、权限、解码或相机技术错误 |

## 结果和重扫

相机、图片都采用一批结果中的首项。默认暂停后显示原文与码制，点击“选用”交付一次并保持暂停。点击“重扫”放弃当前结果，开始新轮次。需要完整多码结果时使用 HmsScanView 或 decodeImage。

回调交付前已标记结果完成；onConfirm 抛错不会撤销交付、自动重扫或再次交付。业务失败应在外部流程处理。

## 异步与配置

相册选择返回 null 恢复扫描；无识别结果与技术错误分别显示。关闭、卸载和有效格式变化后，迟到回调不再采用。原生读取尚未结束时，旧调用继续收尾，新的扫描等待它结束。

formats 按值比较，顺序和重复不重启。标题、提示、父主题、字号和回调身份变化保留设备与结果。新的业务目标由消费方结束旧实例。

普通控件继承 Design 有效主题与字号，没有外层 Provider 时使用 Design 默认。手电 UI 采用 onTorchState.on，不把请求值当成实际状态。

图片借用示例见 [Scanner 指南](/docs/guides/scanner)。
