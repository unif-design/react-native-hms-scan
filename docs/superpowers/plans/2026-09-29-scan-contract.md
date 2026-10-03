# HMS Scan 契约实现计划

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. 主任务已授权直接实现已确认契约；本任务不推送、不创建 PR 或发布。

**Goal:** 以纯识别结果、稳定错误和按次文件交接实现新 HMS Scan 契约。

**Architecture:** 能力边界负责输入、桥接输出和错误归一；Scanner 组合公共能力，分别持有权限、相机回调和选图读取的归属。商品查询交由消费者。

**Tech Stack:** React 19.2.3、React Native 0.86.3、Design 0.30.1、Fabric/TurboModule、Jest。

**Spec:** ../../../../unif-platform-architecture/libraries/react-native-hms-scan.md

## Global Constraints

- 直接实现新契约，不添加旧 API 别名或兼容层。
- decodeImage 仅借用可读 file URI；空识别与技术错误分开。
- 主题/字号/标题变化不重启设备；格式按有效值比较。
- 文件释放只发生于实际读取结束或迟到选图不开始读取时。
- 原生完整构建及真实设备检查由 CI/平台验收补充。

## Review Focus

- 畸形桥接响应不得变为空识别。
- 关闭或格式变化后，旧回调不能采用结果；读取未结束不能开始下一轮。
- onConfirm 抛错仍只交付一次。
- 手电请求与硬件实际回报分开。
- Web 公开入口加载不得触碰原生模块。

## Tasks

- [x] 公共能力：更新 types、format、decodeImage、permissions、HmsScanView、mock、Web 入口和两端原生协议。先为非法桥接、空结果、file URI、错误映射、权限与实时结果编写失败测试；定向 Jest 验证。
- [x] Scanner：结果卡只显示原文/码制；使用实际 SafeArea；实现确认一次、重扫/关闭、格式变化及图片读取释放。先通过公开入口测试上述状态与真实 Design 主题消费，再实现。
- [x] 消费与交付：迁移 example、API/指南、README 和 llms 源；验证 example 消费、mock 类型、类型检查、lint、打包、Codegen 与原生静态接线。记录完整平台未验项及 Portal 迁移方式。


## 实施与验证记录

- 公共入口直接采用新契约；删除商品解析、旧类型/格式工具导出，默认、mock、Web 入口一致。
- Scanner 采用批次首项，交付前标记，按实际 SafeArea 和 Design 主题呈现；旧图片读取收尾后才开始新一轮。
- 两端手电上报区分硬件能力和暗光；iOS 不支持的输入码制显式失败。两端图片入口只读调用方 file URI，Android 不再声明媒体读取权限。
- 按文件职责整理本次重写单元：props/内部类型、码表、样式和具名组件分别归位，公开出口保持新契约；Codegen 源保留工具固定位置。
- 独立审查补齐稀疏 formats 数组的输入拒绝回归，避免两端把缺位分别解释为全码制或 unsupported。
- 独立审查发现实际手电状态与旧请求值不一致时切换错误；新增两条先失败再通过的回归，并同步原生报告作为下一次请求的起点。

环境：Node 24.13.0、npm 11、Yarn 4.11.0；不修改版本范围或锁文件。

| 验证 | 结果 |
| --- | --- |
| `yarn test --runInBand --watchman=false` | 5 项集成契约测试、Android/iOS 接线检查和 19 个 Jest suite / 148 tests 通过 |
| `yarn typecheck` / `yarn lint` | 通过 |
| `yarn prepare` | 33 个模块和公开声明构建通过 |
| React Native Codegen，Android + iOS | 通过，生成 `onTorchState` 与可选字段存在标记 |
| Android 库 debug `compileDebugKotlin` | 通过，19 个任务执行；日志 `/private/tmp/scan-android-compile.log` |
| clang-format 18.1.8 / ktlint 1.8.0 | 全部原生源检查通过 |
| website typecheck / build / llms builder tests | 通过，15 页文档生成 |
| `npm pack` 的公开入口消费 | 默认、browser 和 mock 声明通过外部 TypeScript 消费；browser 条件解析实际 Web 产物，设备方法明确 unsupported |
| `git diff --check` | 通过 |

本地没有执行完整 Android APK / iOS device 构建，也未验真实相机、手电、图库及实际设备生命周期；这些由相应 CI 和设备验收覆盖。iOS 继续使用厂商真实 device framework，不制造模拟器切片。

## 消费迁移与交付

- `Scanner.onConfirm` 必填，只接收一个原始 ScanResult；Portal 直接读取 `result.value`，商品或客户查询移到领域功能。
- 删除 `resolveProduct` 和 ScanProduct；`pickImage` 从字符串改为 `{ uri, onSourceReleased? } | null`，由原图片提供者负责释放。
- Scanner 错误回调改为 `onError`；HmsScanView 仍用 `onScanError`，手电改为 `onTorchState`。
- `decodeImage(uri, options)` 改为 `decodeImage({ uri, formats })`；仅接受可读 file URI，返回 readonly 全部结果。
- 类型采用 ScanFormat、RequestedScanFormat、ScanContentType、ScanPoint、ScanFailure、ScanError、ScanCameraPermission、ScanTorchState；UNKNOWN 只表示结果。
- 本次是 breaking change，无旧 API 别名。PR 应明确破坏性变更；版本由主任务与 release-it 管理。
- PR CI 覆盖 JS、文档、原生 lint 和 Android/iOS example 构建。合并 main 的 src/ios/android/podspec 变更触发 Release；自动流程拒绝跨 major，需按已授权发布流程手动指定级别。发布成功后触发文档部署。
- 本任务只准备工作区改动；提交、PR、合并、发布和 Portal 升级由主任务处理。
