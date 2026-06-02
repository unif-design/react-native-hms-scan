# Changelog

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
