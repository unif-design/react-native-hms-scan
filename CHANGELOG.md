# Changelog

## [0.5.6](https://github.com/unif-design/react-native-hms-scan/compare/v0.5.5...v0.5.6) (2026-08-07)

## [0.5.5](https://github.com/unif-design/react-native-hms-scan/compare/v0.5.4...v0.5.5) (2026-08-03)


### Bug Fixes

* **scanner:** harden scan state and async recovery ([#57](https://github.com/unif-design/react-native-hms-scan/issues/57)) ([6dc1ecb](https://github.com/unif-design/react-native-hms-scan/commit/6dc1ecb5870a521830b16859681782f6f168fe46))

## [0.5.4](https://github.com/unif-design/react-native-hms-scan/compare/v0.5.3...v0.5.4) (2026-07-31)


### Bug Fixes

* **ios:** 根治 ScanKit framework 丢失 ([#52](https://github.com/unif-design/react-native-hms-scan/issues/52)) ([adcfdd4](https://github.com/unif-design/react-native-hms-scan/commit/adcfdd4c186b0c74413b9e3d429c2842d12e5a08))

## [0.5.3](https://github.com/unif-design/react-native-hms-scan/compare/v0.5.2...v0.5.3) (2026-07-31)

## [0.5.2](https://github.com/unif-design/react-native-hms-scan/compare/v0.5.1...v0.5.2) (2026-07-16)

## [0.5.1](https://github.com/unif-design/react-native-hms-scan/compare/v0.5.0...v0.5.1) (2026-06-25)


### Bug Fixes

* **scanner:** 结果卡条码号/副标题改 foregroundMuted 暗色可读(过 AA) ([#41](https://github.com/unif-design/react-native-hms-scan/issues/41)) ([064a4cc](https://github.com/unif-design/react-native-hms-scan/commit/064a4ccfc4153a275c4e4e68cb2d19229769d90b)), closes [#1C1C1E](https://github.com/unif-design/react-native-hms-scan/issues/1C1C1E)

# [0.5.0](https://github.com/unif-design/react-native-hms-scan/compare/v0.4.1...v0.5.0) (2026-06-09)


### Features

* **scanner:** autoConfirm —— 扫到跳过结果卡直接回调 ([#35](https://github.com/unif-design/react-native-hms-scan/issues/35)) ([b329723](https://github.com/unif-design/react-native-hms-scan/commit/b3297232a71cb959fef552245ebbfd7ad1320308))

## [0.4.1](https://github.com/unif-design/react-native-hms-scan/compare/v0.4.0...v0.4.1) (2026-06-09)


### Bug Fixes

* **scanner:** 结果卡/权限态并排按钮改 block,修复 label 不显示 ([#33](https://github.com/unif-design/react-native-hms-scan/issues/33)) ([2e90261](https://github.com/unif-design/react-native-hms-scan/commit/2e90261fa8b94f874a8e807a1ffebf033ff6248e))

# [0.4.0](https://github.com/unif-design/react-native-hms-scan/compare/v0.3.1...v0.4.0) (2026-06-08)


### Features

* **scanner:** Scanner UI 调整 + 底栏返回改 undo ([#32](https://github.com/unif-design/react-native-hms-scan/issues/32)) ([df7108f](https://github.com/unif-design/react-native-hms-scan/commit/df7108f4a9c616df6732f86d07ace994462cacd8))

## [0.3.1](https://github.com/unif-design/react-native-hms-scan/compare/v0.3.0...v0.3.1) (2026-06-08)

# [0.3.0](https://github.com/unif-design/react-native-hms-scan/compare/v0.2.2...v0.3.0) (2026-06-08)


### Bug Fixes

* **codegen:** 补 ios.componentProvider 注册 + deploy-docs/jest 工程优化 ([#30](https://github.com/unif-design/react-native-hms-scan/issues/30)) ([8798c5d](https://github.com/unif-design/react-native-hms-scan/commit/8798c5d0cd105fed4ce8f8d077ed07f388818849))


### Features

* **llms:** sync generator (index desc/TOC/LiveDemo/order) ([#26](https://github.com/unif-design/react-native-hms-scan/issues/26)) ([0bac684](https://github.com/unif-design/react-native-hms-scan/commit/0bac684af58e18027b7362bf31d79fa6425932e3))

## [0.2.2](https://github.com/unif-design/react-native-hms-scan/compare/v0.2.1...v0.2.2) (2026-06-03)


### Bug Fixes

* **ios:** 修 HmsScanView 未注册(Unimplemented component) + 工具栏显隐/手电改进 ([#24](https://github.com/unif-design/react-native-hms-scan/issues/24)) ([689da8b](https://github.com/unif-design/react-native-hms-scan/commit/689da8b779501298ca6aee882e7aedd76dffdc28))

## [0.2.1](https://github.com/unif-design/react-native-hms-scan/compare/v0.2.0...v0.2.1) (2026-06-03)


### Bug Fixes

* **ios:** package.json files 补 scripts 修 pod install 缺脚本(发 0.2.1) ([#22](https://github.com/unif-design/react-native-hms-scan/issues/22)) ([d29ca57](https://github.com/unif-design/react-native-hms-scan/commit/d29ca57b67ac2e6b431fcc3540caa191efb36efb))

# 0.2.0 (2026-06-02)


### Bug Fixes

* **android:** 命名 Event 子类修 RN 0.85 自递归泛型编译错(Fabric event dispatch) ([2caa557](https://github.com/unif-design/react-native-hms-scan/commit/2caa55761aec87f6d0058505fe392f12f77696af))
* **ci:** nightly job 改名 -next 避免撞 ci required + example 加华为 Maven repo ([d355632](https://github.com/unif-design/react-native-hms-scan/commit/d3556327e1ecf04f533a6a0a204da87c12bb7a31))
* **ios:** podspec 声明 AVFoundation/UIKit/Foundation framework(摄像头+torch 符号链接) ([a113f12](https://github.com/unif-design/react-native-hms-scan/commit/a113f1226154e817f29ba3d07769cac007d61b64))
* **ios:** vtool 补 arm64-sim 打 xcframework,修华为 framework 模拟器/CI 链接 ([0d0383e](https://github.com/unif-design/react-native-hms-scan/commit/0d0383e98f04b2353b37d6eb758cdceba415ad81))
* **ios:** 发版携带 reactViewController 的 UIView+React.h import ([#20](https://github.com/unif-design/react-native-hms-scan/issues/20)) ([fb12c29](https://github.com/unif-design/react-native-hms-scan/commit/fb12c29dcddc504ee219365a31ae860579108481))
* **ios:** 显式 import UIView+React.h 修 reactViewController 不可见(prebuilt RNCore) ([d6851d8](https://github.com/unif-design/react-native-hms-scan/commit/d6851d8fe94b9ed63530722068ee2af5b07c2ded))
* **ios:** 重新发版 — reactViewController 的 UIView+React.h import ([#21](https://github.com/unif-design/react-native-hms-scan/issues/21)) ([30bfbb7](https://github.com/unif-design/react-native-hms-scan/commit/30bfbb7b11c0197ffdbf50c8682faed6f3986b4d))
* **website:** build-llms review 加固 + 建 CLAUDE.md [@import](https://github.com/import) AGENTS.md ([#15](https://github.com/unif-design/react-native-hms-scan/issues/15)) ([1e02369](https://github.com/unif-design/react-native-hms-scan/commit/1e02369afd8ae3d366a5cc4f72f04823553af34f))
* **website:** build-llms 升 path.resolve 路径遍历加固 ([#14](https://github.com/unif-design/react-native-hms-scan/issues/14)) ([c6d1980](https://github.com/unif-design/react-native-hms-scan/commit/c6d198082b8d936927d86d417dfc5362d8f930b1))
* 补 turbo devDep(CI build:android/ios 走 yarn turbo,对齐 umeng/design) ([1547ad6](https://github.com/unif-design/react-native-hms-scan/commit/1547ad6ec900b027c7262b05d68250009ed3576e))


### Features

* **website:** hms-scan 站首页重构(代码+扫一扫 hero,引 docs-home.css) ([#17](https://github.com/unif-design/react-native-hms-scan/issues/17)) ([8c4c634](https://github.com/unif-design/react-native-hms-scan/commit/8c4c63497a751bce85896e0c4cda7dcfba80d358))
* **website:** llms.txt 标准化(复制 design build-llms) ([#12](https://github.com/unif-design/react-native-hms-scan/issues/12)) ([84760e2](https://github.com/unif-design/react-native-hms-scan/commit/84760e234a56bbd6b11d93248d0f9ce62408fa49))
* 实现华为 HMS 统一扫码 React Native 库（定制视图 + 图片识别） ([ba8a46e](https://github.com/unif-design/react-native-hms-scan/commit/ba8a46e59e03d64cef75140e6a826fbcee682f5a))
