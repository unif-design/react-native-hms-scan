# react-native-hms-scan 开发资料

本仓库维护 `@unif/react-native-hms-scan`，职责为扫码库。

## 库能力技能

本库使用 unif-hms-scan 定位当前版本的公开能力、接入与排障资料。修改源码时同时采用 code-development 的库开发规则；设计、测试、审查和交付按当前阶段取得依据。应用仅消费库时可直接查公开类型和文档，无需先取得维护工作区。

## 目标契约

[本库新版本设计](../../unif-platform-architecture/libraries/react-native-hms-scan.md)定义职责、公共输入输出、状态和验证边界；[库版本原则](../../unif-platform-architecture/libraries/README.md)明确新旧版本独立。规范根默认是并列的 `unif-platform-architecture` 工作区，其他目录布局由任务提供实际位置。

目标契约用于新版本开发；当前可用接口以实际源码和发布版本为准。版本采用原则在上述库设计索引维护。

## 开发起点

先实现识别结果、权限、实时与图片两条独立路径，再组合 Scanner。商品解析留在业务场景；处理主题继承、手电字段与图片借用交接。

当前可定位的源码与验证入口：

- [公共源码入口](../src/index.tsx)
- [实时扫码](../src/HmsScanView/HmsScanView.tsx)
- [图片解码](../src/decodeImage.ts)
- [权限](../src/permissions.ts)
- [成品交互](../src/Scanner/Scanner.tsx)
- [单元测试](../src/__tests__/)

命令与依赖版本以 [package.json](../package.json)、锁文件及实际安装为准，验证接线见 [.github/workflows](../.github/workflows/)。本文件不复制通用开发、测试或交付规则；按 AGENTS.md 的阶段技能取得所需规范。

历史 spec、plan 和审查记录用于溯源，不作为当前使用文档或新需求入口。

## 原生行为回归

- `yarn test:coverage`：库和 example 的全部 JS/TS 运行源码，语句、分支、函数、行均设 100% 门禁。
- `yarn test:native:android`：使用示例配置的 Kotlin 编译器执行全部六个生产文件，以 JaCoCo 0.8.13 测量。Android/RN/厂商边界由窄测试替身提供。需 JDK 17 和正常 Android 构建已解析的 Gradle 缓存；首次可运行 `bash .github/ci/android.sh`，它先编译真实 Android 库。JaCoCo 自动下载到 `node_modules/.cache/native-coverage` 并核验固定 SHA256，可设置 `JACOCO_HOME` 复用同版本的 agent/cli；下载或校验失败即阻断，代理使用 `HTTP_PROXY`/`HTTPS_PROXY`。
- `yarn test:native:ios`：macOS/Xcode 下编译全部三个生产 `.mm`，以 LLVM profile instrumentation 测量。Foundation KVO、真实后台队列、CoreGraphics 与自有 mapper 实际运行，仅替换 UIKit/RN/相机/厂商边界。
- `yarn test:example:native:android` 与 `yarn test:example:native:ios`：单独执行 example 全部原始宿主代码；iOS 同时执行 DEBUG/RELEASE。Swift 编译器未提供分支计数，明确记为 N/A，不转换成分支 100%。
- 两项通过 `.github/ci/android.sh` 与 `ios.sh` 接入现有共享 CI 扩展钩子。普通 `yarn test` 保留 JS/集成契约测试入口。

原生回归直接运行生产源码；不复制权限、图片队列或手电状态算法。替身不证明真实相机、图片编解码器、厂商识别率、驱动时序或设备峰值内存。测试范围和修复前后证据见[质量验证记录](scan-quality-verification.md)。

原生脚本核对报告的完整源文件清单、记录源码 SHA256，并检查所有可测指标达到 100%。报告写入 `coverage/native/{android,ios,example-android,example-ios}`，RN 0.88 升级及各项分母见 [覆盖率记录](rn88-coverage.md)。

## LLM 文档生成

`website/docs` 是使用文档源；运行 `node website/scripts/build-llms.js` 可单独生成。共同实现由组织 `templates/llms` 分发，维护源后使用 `sync-llms.cjs` 同步，不手改生成副本。

索引按任务列出单页，全文位于 Optional；包版本取当前 package.json。`node website/scripts/build-llms.test.js` 验证公共生成契约与本库资料，文档站构建沿既有 CI 运行。

## 共享主题接入

字体、字重、字距以及固定媒体／品牌调色板统一来自 Design 1.7。取景文字、照片水印与第三方品牌颜色保持原值和语义，普通页面仍随系统明暗主题切换；玻璃材质和减少透明度由 Design 维护。
