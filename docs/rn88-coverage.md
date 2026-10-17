# RN 0.88 开发基线与覆盖率

本次升级固定 React Native 0.88.0、React 19.3.0，example 原生入口对齐正式 community 模板。库发布版本保持 3.0.1。

## 覆盖范围

JS/TS 报告包含全部 `src/**/*.{ts,tsx}` 和 `example/src/**/*.{ts,tsx}`，仅排除测试文件和声明文件。类型、生成原生接口和纯导出入口自然没有运行语句，不通过手工 ignore 删除有效分母。网站与工程脚本分别验证，不属于本报告运行库/example 的分母。

Android 编译全部六个生产 Kotlin 源文件，JaCoCo 0.8.13 对真实 class 执行插桩；iOS 编译全部三个生产 `.mm`，以 LLVM profile instrumentation 测量。Android/RN/厂商边界可以替换，自有 mapper、权限、图像任务和视图生命周期实际运行。边界测试不能替代真机 SDK、识别率和硬件性能验收。

## 不可达防御分支

`example/src/app/ExampleRouter.tsx` 的末项读取原先使用 `?? homeRoute`。路由状态只由内部 `useReducer` 持有，初态是 `[homeRoute]`；`navigate` 只返回长度 1 或 2 的数组；`back` 仅当长度大于 1 才删除末项。归纳可知从初态可达的所有状态长度至少为 1，外部没有状态注入入口，因此回退分支不可达。`exampleNavigation.test.ts` 枚举所有路由间迁移及重复返回；Router 测试保留硬件返回、活动页面消费返回和卸载释放验证。删除这处回退，仅用非空断言表达已证明的不变量，不删除可达错误处理。

删除前全部 JS/example：语句 661/661、函数 172/172、行 613/613、分支 455/456。删除后仪器实测为 661/661、172/172、613/613、454/454，21 个测试套件、201 个测试通过。

Android 的两处 `types.isNotEmpty()` 与 `parseFormatsCsv` 的返回控制流重复：该函数空列表返回 null，非空列表才返回数组；调用间数组不外泄。删除重复条件，保留 null 对应的全部格式逻辑以及无效 CSV 测试。`InvalidScanResponse` 是 final 自有异常，唯一 throw 传入非空字面量；视图的 message 回退无法到达，使用非空断言保留原始异常文本。图像读取的 catch 在向 SDK 交付之前独占 bitmap，唯一先前 recycle 随后立即替换为不同的 upright 对象，故 catch 的 `isRecycled` 检查重复；删除检查，保留转换失败、超额内存与资源一次释放测试。公开 close 的重复释放检查保留并测试。

Android 实测分母（六个生产文件，不排除嵌套类）：首次扩展测试 2050 指令/273 分支/488 行/81 方法；移除上述重复检查后 2023 指令、257 分支、488 行、81 方法均 100%，10 个 class 均执行。各阶段命令日志保留用于分母比对。

iOS mapper 的 `isKindOfClass:NSString` 为 true 已证明对象非 nil（Objective-C 发消息给 nil 返回 false），删除同条件内的 `v != nil` 重复检查；保留无字段、数字字段和 alternate key 的负面测试。

最后一个 iOS 分支来自 `data == nil || error != nil`。原 error 局部变量先初始化为 nil，不能保留调用前错误；[NSJSONSerialization 的官方返回契约](<https://developer.apple.com/documentation/foundation/jsonserialization/data(withjsonobject:options:)?language=objc>)规定内部错误返回 nil、成功返回 UTF-8 数据，[NSError 官方约定](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/ErrorHandlingCocoa/CreateCustomizeNSError/CreateCustomizeNSError.html)规定成功或失败由返回值决定，只有失败才写 error。原实现并不读取错误内容，改传 `NULL` 并保留 `data == nil` 检查，避免重复检验。之前实测 694/694 行、44/44 函数、481/481 区域、279/280 分支；删除后 693/693 行、44/44 函数、477/477 区域、278/278 分支。正常序列化仍使用真实 Foundation，失败测试只在系统 API 边界注入 nil 返回（保留 API 契约），没有伪造“成功 data 同时带失败 NSError”的组合；自有 mapper 不替换。

## 独立 example 宿主

Android 的原始 `MainApplication.kt`、`MainActivity.kt` 直接传给 Kotlin 编译器；JaCoCo 实测 61/61 指令、13/13 行、7/7 方法、7/7 复杂度、2/2 类。源码没有条件分支，分支分母为 0，记为 N/A。

iOS 的原始 `AppDelegate.swift`、`SceneDelegate.swift` 保留 `@main` 直接编译，UIKit/RN 启动边界提供受控替身，Foundation 和 bundle 读取真实执行。DEBUG 36/36 行、5/5 函数、7/7 区域；RELEASE 30/30 行、5/5 函数、7/7 区域。Swift 编译器不生成 branch counters，因此分支 N/A；两个 scene 类型、URL/Universal Link 回调、空/非空调试 bundle 和 release bundle 路径均实际执行。

## 重跑与验证边界

`yarn test:coverage`、`yarn test:native:android`、`yarn test:native:ios`、`yarn test:example:native:android`、`yarn test:example:native:ios` 是覆盖率入口。原生门禁同时检查完整源码清单、SHA256 和全部可测指标，报告位于 `coverage/native`；JS 报告位于 `coverage`。原生 example 宿主在现有本库 `.github/ci` 扩展钩子执行，不修改组织共享 workflow。

网站使用 RNW 0.21.4、SVG 15.16.0 和 assets-registry 0.88.0；仅对 registry 的混合模块应用 Babel CommonJS 转换。SSG、站点类型检查、llms 文档检查及真实 webpack 中 RNW/registry 双向资产注册均通过。网站与工程脚本仅记录相应检查，不宣称全仓源码覆盖 100%。真机相机、厂商 SDK 识别与性能验收由最终集成另行完成。

## 最终工程验证

标准 `yarn test --maxWorkers=2 --coverage` 同时通过既有 5 个集成契约测试和 21 套件/201 个 Jest 测试，所有运行库与 example 指标 100%。Android 与 iOS Debug 工程构建通过。example 自身的 Gemfile/Gemfile.lock 固定 Ruby >=3.3、CocoaPods 1.17.0、ActiveSupport 7.2.4、xcodeproj 1.28.1，`bundle check` 与 `pod install --deployment` 均通过。命令日志归档在 `coverage/rn88-logs`。没有在本任务执行发布、推送、安装或真机验收。
