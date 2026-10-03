# react-native-hms-scan 开发资料

本仓库维护 `@unif/react-native-hms-scan`，职责为扫码库。

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

- `yarn test:native:android`：使用示例配置的 Kotlin 编译器执行真实生产类，Android/RN/厂商边界由窄测试替身提供。需 JDK 17 和正常 Android 构建已解析的 Gradle 缓存；首次可运行 `bash .github/ci/android.sh`，它先编译真实 Android 库。
- `yarn test:native:ios`：macOS/Xcode 下编译真实 `HmsScanView.mm`，使用 Foundation KVO 和 UIKit/RN/相机/厂商边界替身，覆盖视图与手电生命周期。
- 两项通过 `.github/ci/android.sh` 与 `ios.sh` 接入现有共享 CI 扩展钩子。普通 `yarn test` 保留 JS/集成契约测试入口。

原生回归直接运行生产源码；不复制权限、图片队列或手电状态算法。替身不证明真实相机、图片编解码器、厂商识别率、驱动时序或设备峰值内存。测试范围和修复前后证据见[质量验证记录](scan-quality-verification.md)。

## LLM 文档生成

`website/docs` 是使用文档源；运行 `node website/scripts/build-llms.js` 可单独生成。共同实现由组织 `templates/llms` 分发，维护源后使用 `sync-llms.cjs` 同步，不手改生成副本。

索引按任务列出单页，全文位于 Optional；包版本取当前 package.json。`node website/scripts/build-llms.test.js` 验证公共生成契约与本库资料，文档站构建沿既有 CI 运行。
