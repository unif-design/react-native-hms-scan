# iOS ScanKit 真机专用集成根治设计

日期：2026-07-31
状态：已确认，待实施

## 背景

`@unif/react-native-hms-scan@0.5.3` 的 iOS podspec 通过
`prepare_command` 调用 `scripts/prepare-scankit-xcframework.sh`，下载 Huawei
`ScanKitFrameWork`，再用 `vtool` 把真机 arm64 二进制的平台标记改成
arm64-simulator，最终把生成物写入：

```text
node_modules/@unif/react-native-hms-scan/ios/vendor/
```

该方案同时存在两个结构性问题：

1. 生成物位于 `node_modules`，会被 `npm install`、`npm ci` 或依赖重装删除。
2. CocoaPods 只会在它判定 local pod 需要重新安装时运行准备步骤。若
   `node_modules` 已被替换，而 `Pods`、`Podfile.lock` 和 podspec checksum
   仍被判定为有效，准备步骤不会可靠地再次发生。

最终会形成不一致状态：CocoaPods 生成的 XCFramework copy phase 仍指向
`ios/vendor/ScanKitFrameWork.xcframework`，但目录已经不存在，随后 Objective-C++
源码在编译时出现：

```text
'ScanKitFrameWork/ScanKitFrameWork.h' file not found
```

此外，`vtool` 只改写 Mach-O 平台元数据，并没有把 Huawei 真机 SDK
重新编译成真正的 Simulator SDK。它最多用于让非扫码场景编译、链接，不能作为长期支持边界。

## 已确认的产品边界

本次选择 device-only 方案：

- iOS 扫码、图片识别和原生构建仅承诺真机。
- iOS Simulator 编译、启动 App 和运行 ScanKit 均不在当前支持范围。
- Android 行为不变。
- JavaScript API、类型、错误语义和 mock 不变。
- 不把 Huawei 二进制放入 npm 包，不增加 npm 包与最终 IPA 的额外体积。

如果未来需要 Simulator 打开 App，将另行提供正规的 Simulator stub slice；
不得恢复用 `vtool` 把真机二进制伪装成 Simulator 二进制的方案。

## 方案比较

### 方案 B：恢复 Huawei 官方 CocoaPod 依赖（采用）

podspec 直接依赖固定版本的官方 Pod：

```ruby
s.dependency "ScanKitFrameWork", "1.1.2.305"
```

优点：

- 二进制由 CocoaPods 下载并保存在 `Pods`，不依赖 `node_modules` 内的可变生成物。
- 删除安装期下载、拆片、改写和重新打包逻辑。
- npm 包保持轻量，不承担 Huawei 二进制再分发。
- 真机链路与 Huawei 官方分发方式一致，故障面最小。

代价：

- Apple Silicon Simulator 不能作为受支持目标。
- 首次 `pod install` 仍依赖 Huawei 二进制下载地址。

### 随 npm 发布 device-only framework（不采用）

可以在发布阶段生成或下载 framework 并随 npm tarball 发布，但会显著增加 npm
包体积，还需要处理 Huawei 二进制再分发、校验、发布机平台和许可证边界。
既然当前不要求 Simulator，该复杂度没有收益。

### 独立 binary Pod 或 Simulator stub XCFramework（暂不采用）

该方式可以让真机使用 Huawei framework、Simulator 使用安全 stub，并保持 App
可在 Simulator 启动。它需要额外的二进制发布、版本治理和 CI 验证，留作未来确有
Simulator 需求时的独立设计。

## 详细设计

### 1. Podspec

`ReactNativeHmsScan.podspec`：

- 保留 `AVFoundation`、`UIKit`、`Foundation` 系统 framework 声明。
- 恢复并精确锁定 `ScanKitFrameWork 1.1.2.305` 依赖。
- 删除 `prepare_command`。
- 删除本地 `vendored_frameworks` 和 `resources` 声明。
- 删除 arm64-simulator 兼容承诺，不再生成 Simulator slice。
- 保留 React Native New Architecture 的 `install_modules_dependencies(s)`。

精确锁定版本是为了让 Huawei 二进制来源可重复，不因 CocoaPods 解析到未知的新版本而
改变原生行为。升级 Huawei SDK 必须作为单独变更验证。

### 2. 删除生成链路

- 删除 `scripts/prepare-scankit-xcframework.sh`。
- 删除 `.gitignore` 中仅服务于生成物的 `ios/vendor/` 规则。
- 若 `scripts/` 不再包含其他发布文件，从 `package.json#files` 删除 `scripts`。
- npm tarball 不包含 Huawei framework、资源 bundle 或安装期原生生成脚本。

消费者安装后的数据流变为：

```text
npm/yarn 安装 RN 包
        ↓
CocoaPods 读取 ReactNativeHmsScan.podspec
        ↓
CocoaPods 解析并下载 ScanKitFrameWork 1.1.2.305
        ↓
framework 与资源位于 ios/Pods
        ↓
真机目标编译、链接
```

`node_modules` 重装不再删除 CocoaPods 管理的 ScanKit 二进制。

### 3. CI

iOS 原生 CI 不再以 Simulator 为目标，改成 generic iOS device 且关闭签名：

```sh
xcodebuild \
  -workspace example/ios/ReactNativeHmsScanExample.xcworkspace \
  -scheme ReactNativeHmsScanExample \
  -configuration Debug \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  CODE_SIGNING_ALLOWED=NO \
  build
```

CI 必须：

1. 在干净 checkout 中执行 `pod install`。
2. 确认 `Podfile.lock` 解析到 `ScanKitFrameWork (1.1.2.305)`。
3. 每次相关 iOS/podspec 变更都真实执行 generic-device build，不能让 Turbo
   的空输出 cache 命中代替原生验证。
4. 执行 npm pack 内容检查，确认 podspec 被发布，同时不再发布
   `ios/vendor` 和生成脚本。

Release workflow 当前只执行 JS lint/typecheck/test，不能独立证明 native npm
产物可安装；原生 CI 应作为合入与自动发布前的必需门禁。

### 4. 错误与支持边界

- Huawei 下载失败时让 `pod install` 直接失败并保留原始错误，不再添加隐式备用下载。
- `ScanKitFrameWork` 的 LICENSE warning 仍可记录为已知无害 warning。
- Simulator 若出现架构或链接错误，文档直接说明该目标不受支持并要求切换真机，
  不再建议清缓存、重新生成 XCFramework 或修改宿主 Podfile。
- 不增加全局 `EXCLUDED_ARCHS`、header search path 或宿主 `post_install` 补丁。

### 5. 文档同步

需要同步校准：

- `README.md`
- `AGENTS.md`
- `website/docs/intro.md`
- `website/docs/getting-started/installation.md`
- `website/docs/getting-started/quick-start.md`
- `website/docs/platform-differences.md`
- `website/docs/troubleshooting.md`
- `../skills/skills/hms-scan/` 中对应 Skill

统一表述为：

- iOS 使用官方 `ScanKitFrameWork` CocoaPod。
- iOS 仅支持真机；Simulator 不能作为当前 App 构建目标。
- `pod install` 自动安装官方依赖，但不再生成本地 XCFramework。
- 后续 Simulator 支持必须使用正规 stub，不使用 `vtool` 改写真机二进制。

公共 API、类型、mock、Android 配置和扫码运行时语义不受影响，对应文档只需核对，
无需无关改写。

## 消费者迁移

修复合入 `main` 后由现有 release workflow 自动发布 patch 版本，不手工修改版本、
创建 tag 或执行 `npm publish`。

Portal 侧迁移：

1. 更新 `@unif/react-native-hms-scan` 到修复版本并更新 lockfile。
2. 执行 `bundle exec pod install`。
3. 确认 `Podfile.lock` 同时包含修复版本的 `ReactNativeHmsScan` 和
   `ScanKitFrameWork (1.1.2.305)`。
4. 使用真机目标执行 Debug build。
5. 真机验证打开扫码页、相机扫码和 `decodeImage`。

正常版本升级会使 CocoaPods 重新读取 podspec，并移除旧的 XCFramework copy phase。
只有在 CocoaPods 明确保留旧集成时，才执行针对
`ReactNativeHmsScan`/`ScanKitFrameWork` 的定向 pod update；不默认使用
`pod deintegrate` 或全量清理。

## 验收标准

- 发布包安装后不存在 `ios/vendor` 依赖。
- podspec 不包含 `prepare_command`、`vendored_frameworks` 或 `vtool` 生成逻辑。
- 干净环境 `pod install` 成功解析 `ScanKitFrameWork 1.1.2.305`。
- generic iOS device、关闭签名的原生 CI 构建通过。
- 真机能够启动 example，并通过相机扫码与本地图片识别的人工 smoke test。
- 重装 `node_modules` 后再次执行 `pod install`，真机编译不再出现
  `ScanKitFrameWork.h file not found`。
- npm tarball 不包含 Huawei 二进制，包体积不因本次修复显著增长。
- Android、JS API、类型、错误码与官方 mock 的现有测试保持通过。
- 文档与 hms-scan Skill 不再宣称 Simulator 可编译、链接或启动。

## 风险与后续

- Huawei 官方 Pod 仍是旧式 device framework，未来 Xcode 若停止兼容，需要重新评估
  iOS 扫码引擎或正规二进制封装。
- Huawei 下载地址属于外部依赖；CI 与首次安装可能受网络可用性影响，但该风险由
  CocoaPods 缓存管理，不在 RN 包中另造下载器。
- 如果产品未来要求 Simulator 打开 App，应单独设计真机 framework +
  Simulator stub 的 XCFramework，并分别验证 device/simulator slice；该能力不与本次
  device-only 修复捆绑。

## 参考

- CocoaPods podspec 语法：
  https://guides.cocoapods.org/syntax/podspec.html
- Huawei CocoaPods `ScanKitFrameWork 1.1.2.305` 规格：
  `~/.cocoapods/repos/trunk/Specs/2/6/3/ScanKitFrameWork/1.1.2.305/ScanKitFrameWork.podspec.json`
- 引入当前生成方案的提交：
  https://github.com/unif-design/react-native-hms-scan/commit/0d0383e98f04b2353b37d6eb758cdceba415ad81
