# 扫码库质量验证（2026-09-30）

本记录对应 `codex/scan-contract` 上基于 `9189bde` 的资源与并发修复，不代表设备性能基准。

## 生产实现与回归

Android 测试脚本编译实际 `HmsScanModule.kt`、`HmsScanView.kt`、`HmsScanImage.kt` 和 `HmsScanResultMapper.kt`。边界替身只提供 Android、React Native、JSON 和厂商接口；权限 Activity 模拟 RN 0.86 同时持有一个 PermissionListener 的行为，厂商替身保留锁定 Scan Kit 超过 52,428,800 像素直接返回空结果的边界。

iOS 测试脚本编译实际完整 `HmsScanView.mm`，Foundation/KVO 来自系统框架，UIKit、Fabric、AVFoundation 与厂商对象使用可控替身。

修改生产代码之前，Android 9 个行为回归均失败：100 次视图挂载/卸载留存 100 个监听、重复手电报告、两次并发权限申请、宿主销毁后未结算、54MP 图片全量分配、EXIF 方向、非整除采样坐标、超大尺寸返回空数组、解码仍占用调用线程。iOS 4 个回归均失败：初次创建两个控制器、移除窗口未报告关灯、重新挂载丢失请求、外部手电变化未回报。

修复后 Android 14 项通过，包含以上 9 项及队列满/销毁/在途借用、厂商异常回收、EXIF 变换失败回收、变换返回相同 Bitmap 时只回收一次、模块销毁后权限晚回调只结算一次。iOS 5 项通过：除原有 4 项，还补入硬件异步关灯回归。该回归先复现“请求已返回但延迟的实际关灯回报丢失”，修复后 detach 保持观察到真实关闭，再移除观察。

### 手算坐标样例

| 原始文件尺寸 / EXIF | 传给 SDK 的位图 | SDK 角点 | 原图角点期望 |
| --- | --- | --- | --- |
| 9000×6000 / 正常 | 2250×1500 | (10, 20) | (40, 80) |
| 9000×6000 / 90° | 1500×2250 | (10, 20) | (40, 80)，原图方向为 6000×9000 |
| 9001×6001 / 270° | 1501×2251 | (10, 20) | (39.98001332445, 79.97334517992)，原图方向为 6001×9001 |

最后一项手算为 `10 × 6001 / 1501` 与 `20 × 9001 / 2251`。测试直接断言这些常数，不通过生产 mapper 生成期望。实际解码器若采用不同取整，生产映射仍以实际解码位图尺寸为分母。

## 资源和错误规则

- `HmsScanImage` 独占 Bitmap，方向变换失败、厂商向外抛出异常或正常返回都先释放再结算图片 Promise；传入文件始终由调用者持有。
- Android 解码目标最多 8,388,608 像素（ARGB 32 MiB），旋转临时最多两张预算内位图。源文件上限 128 MiB，宽高各 32,768，总像素 268,435,456。厂商额外工作内存未实测或限定。
- 图片队列最多一个执行中、四个等待中。满队列拒绝 `E_UNAVAILABLE`，销毁时拒绝等待任务；执行中的厂商读取不被打断，保持借用直到实际结束。
- 本库检测到尺寸/预算不满足时返回 `E_INVALID_INPUT`，检测到读取失败时返回 `E_IMAGE_LOAD_FAILED`，捕获到解码/识别异常时返回 `E_DECODE_FAILED`；本库不主动把这些可检测错误转成 `[]`。
- 锁定的 Scan Kit Plus `2.15.0.301` 内部可能把远程解码器创建失败或 `RemoteException` 转成默认空数组。已核对内部 `com.huawei.hms.hmsscankit.f.a(Context, Bitmap, HmsScanAnalyzerOptions, int)` 字节码；SDK 未向外抛出这些错误，本库无法将这类静默失败与无识别结果区分，`[]` 只表示 SDK 本次未交付识别结果。
- Android 生命周期监听跟随视图挂载；权限监听只在一批申请期间注册。iOS 设备观察在挂载后注册，移出窗口后确认真实关灯再移除，回收/销毁时总是移除；初次 props 只创建一次 SDK 控制器。
- Scanner 现有 session key 保留，用于隔离旧会话晚回调；没有为拆文件而移动其异步归属逻辑。

## 复现命令

```sh
yarn test:native:android
yarn test:native:ios
./example/android/gradlew -p example/android :unif_react-native-hms-scan:compileDebugKotlin --offline --max-workers=2
yarn test --maxWorkers=2 --watchman=false
yarn typecheck
yarn lint
yarn prepare
ktlint 'android/**/*.kt' 'android/**/*.kts' 'scripts/native-tests/android/**/*.kt'
```

原生格式采用共享 CI 固定的 ktlint 1.8.0 与 clang-format 18。iOS 行为测试无需设备或厂商模拟器切片；完整 App 编译沿既有 example CI 验证。

## 未验证边界

边界测试不运行 Android BitmapFactory 真正解码，也不测实际 EXIF 镜像像素、厂商码识别、设备相机/手电驱动、iOS 异步硬件时序或峰值内存。大图采样可能降低小码识别率；预算是资源策略，不是无损识别承诺。仍需设备覆盖旋转/镜像图片、超大图、连续页面开关、后台切换和硬件手电变化。

## 本轮验证结果

环境使用已有 Node 24.13.0、JDK 17、Xcode 命令行工具及依赖；未改依赖版本或锁文件。

| 检查 | 结果 |
| --- | --- |
| Android 生产类行为回归 | 14/14 通过 |
| iOS 生产 View 行为回归 | 5/5 通过 |
| Android 真实库 `compileDebugKotlin`（离线，2 workers） | 通过 |
| iOS example / Xcode 27 | 当前源码隔离副本的 Debug iPhoneOS 完整编译及链接通过，未签名；使用 `IPHONEOS_DEPLOYMENT_TARGET=15.1`，仅为本机 iOS 27 环境补充验证 |
| `yarn test --maxWorkers=2 --watchman=false` | 集成契约 5/5、Android/iOS 接线检查通过；Jest 19 suites / 148 tests 通过 |
| `yarn typecheck`、`yarn lint`、`yarn prepare` | 通过 |
| ktlint 1.8.0、clang-format 18.1.8（生产和原生回归源码） | 通过 |
| LLM 文档生成及生成契约测试 | 通过 |
| shell 语法、Python 编译、`git diff --check` | 通过 |

Jest 初次环境验证遇到沙盒禁止写入用户 npm 缓存，以及 Watchman socket 不可用；最终使用临时 `npm_config_cache` 和 `--watchman=false` 完整通过，无项目配置绕过。本轮主任务完成了上述 iOS example 补充编译；未重跑完整 Android APK。边界替身测试和 App 编译均不能当作真机运行结果。独立审查重跑 Android 14 项 / iOS 5 项并核对 RN、AVCaptureDevice 及锁定 Scan Kit 字节码，未发现新增运行代码 P1/P2；据此修正了 SDK 空数组语义的过度保证。
