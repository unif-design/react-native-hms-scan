# iOS ScanKit 真机专用集成根治 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 Huawei 官方 `ScanKitFrameWork 1.1.2.305` CocoaPod 取代 `node_modules` 内的临时 XCFramework 生成链路，确保 iOS 真机构建可重复，并在发布 `0.5.4` 后让 PecPortal 恢复真机安装与扫码。

**Architecture:** `@unif/react-native-hms-scan` 的 podspec 只声明固定版本的官方二进制依赖，CocoaPods 独立管理 `Pods` 中的 framework 和资源；仓库级验证脚本锁定 podspec、npm tarball、generic-device CI 目标和 Pod lockfile。公共 JS API 与 Android 实现不变，iOS Simulator 明确不在当前支持范围。

**Tech Stack:** React Native 0.85/0.86 New Architecture、Objective-C++、CocoaPods、Yarn 4、npm pack、Turbo 2、Jest、Docusaurus 3、GitHub Actions。

## Global Constraints

- 采用已确认的方案 B：iOS 只支持真机，不生成或伪造 Simulator slice。
- 禁止恢复 `vtool`、`prepare_command`、`ios/vendor`、全局 `EXCLUDED_ARCHS`、宿主 Header Search Path 或 Podfile `post_install` 补丁。
- `ScanKitFrameWork` 必须精确锁定为 `1.1.2.305`，SDK 升级另开变更。
- 不修改 JS API、TypeScript 类型、错误语义、mock、Android 依赖或扫码状态机。
- 不手工修改库版本、创建 tag 或执行 `npm publish`；合入后由现有 release workflow 从 `0.5.3` 自动发布 patch `0.5.4`。
- 库仓与 Skill 仓使用 Yarn/各自验证命令；Portal 沿用 npm、Bundler 和 CocoaPods。
- 三个仓库分别使用独立 branch/PR。不得把 sibling 仓库改动混入同一 Git commit。
- 保留 `/Users/liulijun/tongyi/design/skills` 中用户已有的未跟踪 `.worktrees/`，不得清理或加入提交。
- `CHANGELOG.md` 和已确认的设计文档保留历史描述，不把过去发生过的 `vtool` 方案改写掉。

---

## Phase 1：修复并发布 `@unif/react-native-hms-scan`

### Task 1：先建立会失败的 iOS 集成契约

**Files:**

- Create: `scripts/verify-ios-integration.mjs`
- Modify: `package.json:39-46`

- [ ] 在现有 `fix/ios-device-only-scankit` branch 上确认只有设计与计划文档提交，工作树无其他改动：

```sh
git status --short --branch
git log --oneline -3
```

Expected: branch 为 `fix/ios-device-only-scankit`，没有未识别的用户代码改动。

- [ ] 创建 `scripts/verify-ios-integration.mjs`，先只加入 podspec、生成链路和 npm tarball 契约：

```js
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const read = (relativePath) =>
  readFileSync(path.join(rootDir, relativePath), 'utf8');

const podspec = read('ReactNativeHmsScan.podspec');
assert.match(
  podspec,
  /s\.dependency\s+"ScanKitFrameWork",\s+"1\.1\.2\.305"/,
  'podspec 必须精确依赖 ScanKitFrameWork 1.1.2.305'
);

for (const forbidden of [
  'prepare_command',
  'vendored_frameworks',
  'ios/vendor',
  'vtool',
]) {
  assert.equal(
    podspec.includes(forbidden),
    false,
    `podspec 不得包含 ${forbidden}`
  );
}

assert.equal(
  existsSync(
    path.join(rootDir, 'scripts/prepare-scankit-xcframework.sh')
  ),
  false,
  '旧 XCFramework 生成脚本必须删除'
);

const packageJson = JSON.parse(read('package.json'));
assert.equal(
  packageJson.files.includes('scripts'),
  false,
  'repo-only 验证脚本不得随 npm 包发布'
);

const [packResult] = JSON.parse(
  execFileSync(
    'npm',
    ['pack', '--dry-run', '--json', '--ignore-scripts'],
    {
      cwd: rootDir,
      encoding: 'utf8',
    }
  )
);
const packedPaths = new Set(packResult.files.map((file) => file.path));

assert.equal(
  packedPaths.has('ReactNativeHmsScan.podspec'),
  true,
  'npm tarball 必须包含 podspec'
);
assert.equal(
  packedPaths.has('scripts/prepare-scankit-xcframework.sh'),
  false,
  'npm tarball 不得包含旧生成脚本'
);
assert.equal(
  [...packedPaths].some((packedPath) =>
    packedPath.startsWith('ios/vendor/')
  ),
  false,
  'npm tarball 不得包含 Huawei 二进制'
);
```

- [ ] 在根 `package.json#scripts` 中加入验证命令，并把它放在 Jest 前面，使现有 CI/release 的 `yarn test --maxWorkers=2 ...` 自动执行该门禁，同时仍把追加参数传给最后的 Jest 命令：

```json
{
  "scripts": {
    "test": "yarn verify:ios-integration && jest",
    "verify:ios-integration": "node scripts/verify-ios-integration.mjs"
  }
}
```

- [ ] 运行红灯验证：

```sh
yarn verify:ios-integration
```

Expected: 非零退出，并显示 `podspec 必须精确依赖 ScanKitFrameWork 1.1.2.305`。此时不得弱化断言。

### Task 2：恢复官方 CocoaPod 并删除易失生成链路

**Files:**

- Modify: `ReactNativeHmsScan.podspec:19-37`
- Modify: `package.json:20-46`
- Modify: `.gitignore:84-85`
- Modify: `src/index.tsx:1-4`
- Delete: `scripts/prepare-scankit-xcframework.sh`
- Verify: `scripts/verify-ios-integration.mjs`

- [ ] 将 podspec 的 Huawei 集成段替换为固定版本官方依赖；保留三个系统 framework 与 `install_modules_dependencies(s)`：

```ruby
  # hms-scan 使用 AVFoundation（摄像头权限 + torch）；
  # UIKit / Foundation 显式声明，避免依赖传递关系。
  s.frameworks = "AVFoundation", "UIKit", "Foundation"

  # Huawei Scan Kit iOS SDK（自包含，无需 AppGallery Connect / API Key）。
  # 当前只支持真机；Simulator 不生成兼容切片。
  s.dependency "ScanKitFrameWork", "1.1.2.305"

  # 接入 New Architecture（Fabric 组件 + TurboModule）的 codegen 依赖。
  install_modules_dependencies(s)
```

- [ ] 用 `apply_patch` 删除 `scripts/prepare-scankit-xcframework.sh`，不要保留下载 URL、`lipo`、`vtool` 或 `xcodebuild -create-xcframework` 的备用路径。

- [ ] 从 `.gitignore` 删除仅服务于旧生成物的注释和 `ios/vendor/` 规则。

- [ ] 从 `package.json#files` 删除 `"scripts"`；保留 `scripts/verify-ios-integration.mjs` 作为 repo-only 文件，不把它发布到 npm tarball。

- [ ] 从 `src/index.tsx` 删除“0.2.1 补 scripts / prepare_command”的历史实现注释；保留能力说明和文档站链接。

- [ ] 运行绿灯验证：

```sh
yarn verify:ios-integration
yarn test --runInBand
```

Expected: 集成验证通过；所有现有 Jest 测试通过。`npm pack --dry-run` 不运行 `prepare`，也不出现 `scripts/` 或 `ios/vendor/`。

- [ ] 查看本任务 diff，确认没有 JS API 或 Android 代码变化：

```sh
git diff --check
git diff -- ReactNativeHmsScan.podspec package.json .gitignore src/index.tsx scripts
```

- [ ] 提交第一个可工作的原子变更：

```sh
git add ReactNativeHmsScan.podspec package.json .gitignore src/index.tsx scripts
git commit -m "fix(ios): restore official ScanKit CocoaPod"
```

### Task 3：把 CI 和示例固定到 generic iOS device

**Files:**

- Modify: `scripts/verify-ios-integration.mjs`
- Modify: `example/package.json:5-11`
- Modify: `turbo.json:22-41`
- Generated locally, not committed: `example/ios/Podfile.lock`

- [ ] 在验证脚本的 npm pack 断言之后加入示例命令与 Turbo cache 契约：

```js
const examplePackageJson = JSON.parse(read('example/package.json'));
assert.equal(
  examplePackageJson.scripts.ios,
  'react-native run-ios --device',
  '示例 ios 命令必须选择物理设备'
);
assert.equal(
  examplePackageJson.scripts['build:ios'],
  'node ../scripts/verify-ios-integration.mjs --require-lock && react-native build-ios --mode Debug --device --extra-params "CODE_SIGNING_ALLOWED=NO"',
  'CI 必须构建 generic iOS device 并关闭签名'
);

const turbo = JSON.parse(read('turbo.json'));
assert.equal(
  turbo.tasks['build:ios'].cache,
  false,
  'iOS native build 不得被 Turbo cache 代替'
);

if (process.argv.includes('--require-lock')) {
  const lockPath = path.join(rootDir, 'example/ios/Podfile.lock');
  assert.equal(
    existsSync(lockPath),
    true,
    'native build 前必须生成 example/ios/Podfile.lock'
  );
  assert.match(
    read('example/ios/Podfile.lock'),
    /- ScanKitFrameWork \(1\.1\.2\.305\)/,
    'Podfile.lock 必须解析到 ScanKitFrameWork 1.1.2.305'
  );
}
```

- [ ] 再次运行验证，确认新增契约先失败：

```sh
yarn verify:ios-integration
```

Expected: 非零退出，首先指出示例仍是 `react-native run-ios`。

- [ ] 修改 `example/package.json`：

```json
{
  "scripts": {
    "ios": "react-native run-ios --device",
    "build:ios": "node ../scripts/verify-ios-integration.mjs --require-lock && react-native build-ios --mode Debug --device --extra-params \"CODE_SIGNING_ALLOWED=NO\""
  }
}
```

- [ ] 在 `turbo.json#tasks.build:ios` 加入：

```json
{
  "cache": false
}
```

保留现有 `env`、`inputs` 和 `outputs`。不要直接修改由共享模板生成的 `.github/workflows/ci.yml`；`cache: false` 会使其中的 dry-run 不可能报告 `HIT`，从而每次执行 Xcode、Bundler 和 CocoaPods 步骤。

- [ ] 运行静态绿灯：

```sh
yarn verify:ios-integration
yarn turbo run build:ios --dry=json
```

Expected: 验证通过；`build:ios` task 显示 cache disabled/bypass，不是可复用的 `HIT`。

- [ ] 安装 example 的 Ruby/Pod 依赖并生成干净 lockfile：

```sh
cd example
bundle install
bundle exec pod repo update --verbose
bundle exec pod install --project-directory=ios
cd ..
```

Expected: CocoaPods 安装 `ScanKitFrameWork (1.1.2.305)`；LICENSE warning 可以出现，但不能出现 header 缺失或本地 `ios/vendor` 路径。

- [ ] 验证解析结果：

```sh
node scripts/verify-ios-integration.mjs --require-lock
rg -n "ScanKitFrameWork \\(1\\.1\\.2\\.305\\)" example/ios/Podfile.lock
```

Expected: 两条命令成功。`example/ios/Podfile.lock` 已被 `.gitignore` 忽略，不加入提交。

- [ ] 执行与 CI 相同的 generic-device Debug build：

```sh
yarn turbo run build:ios --cache-dir=.turbo/ios
```

Expected: Xcode 目标是 `generic/platform=iOS`，`CODE_SIGNING_ALLOWED=NO`，最终 `BUILD SUCCEEDED`。不得用 Simulator 构建替代此验证。

- [ ] 提交 CI 边界：

```sh
git add scripts/verify-ios-integration.mjs example/package.json turbo.json
git commit -m "ci(ios): verify uncached device build"
```

### Task 4：统一库 README、示例和网站的支持边界

**Files:**

- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `example/README.md`
- Modify: `website/docs/intro.md`
- Modify: `website/docs/getting-started/installation.md`
- Modify: `website/docs/getting-started/quick-start.md`
- Modify: `website/docs/platform-differences.md`
- Modify: `website/docs/troubleshooting.md`
- Modify: `website/docs/testing.md`
- Modify: `website/docs/api/hms-scan-view.md`
- Modify: `website/docs/api/scanner.md`
- Modify: `website/docs/skills.md`
- Generated, ignored: `website/static/llms.txt`
- Generated, ignored: `website/static/llms-full.txt`

- [ ] 在所有入口统一使用以下事实，不复制旧实现细节：

```md
iOS 通过 CocoaPods 安装官方 `ScanKitFrameWork 1.1.2.305`，当前只支持真机构建和运行。
iOS Simulator 不属于支持目标；无硬件逻辑测试使用随包 Jest mock。
`pod install` 不再在 `node_modules` 中生成 XCFramework。
```

- [ ] 在 `README.md` 和 `website/docs/intro.md` 的平台支持表中把 `iOS simulator` 标为不支持；把 iOS 行说明为“官方 CocoaPod + 真机”。

- [ ] 在 `AGENTS.md` 删除“simulator 可编译/运行”和本地 XCFramework 生成说明，写明维护者不得恢复 `vtool` 伪造切片；保留 LICENSE warning 无害的事实。

- [ ] 在 `example/README.md` 把 iOS 启动命令改为连接物理设备后执行：

```sh
yarn ios
```

说明该脚本会进入物理设备选择；删除 iOS Simulator 的启动、reload 或测试指引。

- [ ] 在 installation/quick-start/platform-differences 页面说明：

  - `pod install` 自动解析官方 Pod；
  - iOS 相机扫码与 `decodeImage` 原生路径都用真机验证；
  - Simulator 架构/链接失败属于当前明确的 unsupported target；
  - 不建议清理 cache、重新生成 XCFramework 或修改宿主 Podfile。

- [ ] 将 troubleshooting 的 iOS 首项改为“切换真机目标”的决策树。保留 LICENSE warning 条目，并明确真正的真机构建若找不到 header 才属于集成故障。

- [ ] 在 testing 与两个 API 平台表中写明：iOS 原生目标只支持真机；Jest mock 可在无 iOS 硬件环境验证 JS 逻辑，不能把 mock 结果表述成 Simulator 原生支持。

- [ ] 在 `website/docs/skills.md` 把 Skill 的触发描述改为“排查 iOS 真机/Simulator 支持边界”，删除“simulator slice 应链接成功”的说法。

- [ ] 搜索活文档中的旧承诺：

```sh
rg -n "prepare_command|vtool|ios/vendor|simulator slice|simulator 应能|模拟器可编译|模拟器可以编译" README.md AGENTS.md example/README.md website/docs src/index.tsx
```

Expected: 零匹配。历史 `CHANGELOG.md` 和 `docs/superpowers/specs/` 不在搜索范围。

- [ ] 搜索新的支持边界，人工确认关键入口均覆盖：

```sh
rg -n "1\\.1\\.2\\.305|仅支持真机|Simulator.*不支持|模拟器.*不支持" README.md AGENTS.md example/README.md website/docs
```

Expected: README、installation、platform differences、troubleshooting、testing 和 Skill 导览均有准确命中，且没有把 Android emulator 一并误标为不支持。

- [ ] 生成 llms 内容并验证 Docusaurus：

```sh
yarn workspace @unif/react-native-hms-scan-website build:llms
yarn workspace @unif/react-native-hms-scan-website typecheck
yarn workspace @unif/react-native-hms-scan-website build
```

Expected: 三条命令成功；两个 `website/static/llms*.txt` 仍是 ignored build artifacts，不加入提交。

- [ ] 提交文档同步：

```sh
git add README.md AGENTS.md example/README.md website/docs
git commit -m "docs(ios): document device-only ScanKit support"
```

### Task 5：完成库仓全量验证并创建 PR

**Files:**

- Verify only: all changed library files
- Do not modify: `.github/workflows/ci.yml`
- Do not modify: `package.json#version`
- Do not modify: `CHANGELOG.md`

- [ ] 运行完整静态与 JS 验证：

```sh
git diff --check origin/main...HEAD
yarn lint
yarn typecheck
yarn test --maxWorkers=2 --coverage
yarn prepare
```

Expected: 全部成功；`yarn test` 的第一步会执行 npm tarball/iOS 集成契约。

- [ ] 再运行一次 native/device 与网站验证，保留终端证据：

```sh
node scripts/verify-ios-integration.mjs --require-lock
yarn turbo run build:ios --cache-dir=.turbo/ios
yarn workspace @unif/react-native-hms-scan-website build
```

Expected: `ScanKitFrameWork 1.1.2.305` 锁定、generic-device `BUILD SUCCEEDED`、网站构建成功。

- [ ] 检查发布内容和体积边界：

```sh
npm pack --dry-run --json --ignore-scripts
```

Expected: 包含 `ReactNativeHmsScan.podspec`；不包含 `scripts/`、`ios/vendor/`、`.framework`、`.xcframework` 或 `.bundle`。因此本方案不把 Huawei 二进制加入 npm 包。

- [ ] 调用 `requesting-code-review` Skill，对照设计文档和本计划检查：

  - podspec 只走官方 Pod；
  - CI 确实构建 device；
  - test/release 都执行 tarball 契约；
  - 文档没有残留 Simulator 支持承诺；
  - 没有无关 API/Android 改动。

- [ ] 修复 review 中确认成立的问题，每个修复后重跑最小相关验证，并用清晰的 `fix:`/`docs:` commit 提交。

- [ ] 创建库 PR：

```sh
gh pr create --base main --head fix/ios-device-only-scankit --title "fix(ios): 根治 ScanKit framework 丢失" --body-file docs/superpowers/specs/2026-07-31-ios-device-only-scankit-design.md
```

PR 描述正文可在创建前另存临时文件以补充验证结果；不得把临时文件提交。等待 required CI 全绿后再合入。

---

## Phase 2：同步 `unif` 的 hms-scan Skill

### Task 6：在 Skill 仓建立 companion PR

**Repository:** `/Users/liulijun/tongyi/design/skills`

**Files:**

- Modify: `skills/hms-scan/SKILL.md`
- Modify: `skills/hms-scan/references/native-setup.md`
- Modify: `skills/hms-scan/references/troubleshooting.md`
- Do not modify: `.claude-plugin/marketplace.json`
- Do not modify: `.agents/plugins/marketplace.json`
- Do not modify: `.cursor-plugin/marketplace.json`
- Do not modify: `skills/hms-scan/scripts/doctor.sh`
- Do not modify: `skills/hms-scan/scripts/doctor.test.sh`

- [ ] 调用 `using-git-worktrees` Skill，从当前 `origin/main` 创建独立 worktree，避开主工作树已有的未跟踪 `.worktrees/`：

```sh
cd /Users/liulijun/tongyi/design/skills
git status --short --branch
git worktree add /Users/liulijun/tongyi/design/skills-hms-scan-device-only -b fix/hms-scan-device-only origin/main
cd /Users/liulijun/tongyi/design/skills-hms-scan-device-only
```

Expected: 新 worktree 位于 `fix/hms-scan-device-only`；原仓 `.worktrees/` 仍未跟踪且内容未变化。

- [ ] 记录旧承诺作为变更前红灯：

```sh
rg -n "生成.*simulator|simulator 应|这不是当前预期|prepare.*xcframework|simulator 切片" skills/hms-scan
```

Expected: 命中 `SKILL.md`、`native-setup.md` 和 `troubleshooting.md` 的旧方案描述。

- [ ] 将 `skills/hms-scan/SKILL.md#metadata.version` 从 `0.2.3` 提升为 `0.2.4`。按现有仓库惯例，单个 Skill 内容版本独立变化，不提升 marketplace 或聚合 `unif` plugin 版本。

- [ ] 将 `SKILL.md` 的偏好和 Incorrect/Correct 示例改为：

  - iOS 使用官方 `ScanKitFrameWork 1.1.2.305` CocoaPod；
  - iOS 只支持真机，Simulator 构建/启动失败是当前预期边界；
  - 正确处理是选择物理设备；
  - JS 逻辑测试使用 `@unif/react-native-hms-scan/mock`；
  - 禁止建议 `vtool`、生成 Simulator slice 或宿主 Podfile 补丁。

- [ ] 将 `references/native-setup.md` 的 iOS 部分改为：

```md
- `pod install` 会通过 CocoaPods 安装官方 `ScanKitFrameWork 1.1.2.305`。
- iOS 原生构建与运行仅支持真机；Simulator 不属于当前支持目标。
- 无硬件逻辑测试使用随包 Jest mock，不需要生成本地 XCFramework。
```

- [ ] 将 `references/troubleshooting.md` 的首项和症状速查表改为：

  - Simulator 架构/链接失败：切换真机，不清 Pods 来追求 Simulator 成功；
  - 真机报 `ScanKitFrameWork.h` 缺失：确认包版本至少 `0.5.4`、执行 `pod install`、确认 lockfile 为 `1.1.2.305`；
  - LICENSE warning：仍然无害；
  - 其余 Android、`decodeImage`、torch、format 内容不改语义。

- [ ] 确认旧承诺归零：

```sh
rg -n "生成.*simulator|simulator 应|这不是当前预期|prepare.*xcframework|simulator 切片" skills/hms-scan
```

Expected: 零匹配。

- [ ] 按 Skill 仓规则执行全部验证：

```sh
python3 scripts/validate_repository.py
python3 scripts/validate_portal_consistency.py
for test_file in skills/*/scripts/doctor.test.sh; do bash "$test_file"; done
```

Expected: repository、portal consistency 和所有 doctor fixture 全部通过；`SKILL.md` 仍少于 500 行。

- [ ] 检查只修改三个 hms-scan 文档文件：

```sh
git diff --check
git status --short
git diff -- skills/hms-scan
```

- [ ] 提交并创建 companion PR：

```sh
git add skills/hms-scan/SKILL.md skills/hms-scan/references/native-setup.md skills/hms-scan/references/troubleshooting.md
git commit -m "docs(hms-scan): align iOS device-only support"
gh pr create --base main --head fix/hms-scan-device-only --title "docs(hms-scan): 对齐 iOS 真机专用边界" --body "同步 react-native-hms-scan 的官方 CocoaPod + device-only 根治方案；保留 Android 与 JS API 语义。"
```

等待 companion PR 验证通过。Skill 仓合入不替代库仓 native CI。

---

## Phase 3：发布 `0.5.4` 后修复 PecPortal

### Task 7：确认自动发布产物

**Repository:** `/Users/liulijun/tongyi/design/react-native-hms-scan`

**Files:** Verify only

- [ ] 库 PR 合入 `main` 后监控 release workflow；确认自动 release commit/tag 为 `v0.5.4`，不要手工 bump、tag 或 publish。

- [ ] 等 npm registry 可见后验证：

```sh
npm view @unif/react-native-hms-scan@0.5.4 version
npm view @unif/react-native-hms-scan@0.5.4 dist.unpackedSize
```

Expected: version 输出 `0.5.4`；包体积没有包含数十 MB 的 Huawei framework。

- [ ] 下载发布 tarball 做最终内容审计：

```sh
npm pack @unif/react-native-hms-scan@0.5.4 --dry-run --json --ignore-scripts
```

Expected: 有 podspec，无 `scripts/`、`ios/vendor/`、`.framework`、`.xcframework` 或 Huawei bundle。只有该检查通过才进入 Portal 升级。

### Task 8：Portal 升级到 `0.5.4` 并完成真机验收

**Repository:** `/Users/liulijun/tongyi/unif/portal`

**Files:**

- Modify: `package.json:36`
- Modify: `package-lock.json`
- Modify: `ios/Podfile.lock`
- Do not modify: `ios/Podfile`
- Do not modify: `src/**`

- [ ] 确认 Portal `main` 工作树干净，然后创建独立 branch：

```sh
cd /Users/liulijun/tongyi/unif/portal
git status --short --branch
git switch -c fix/hms-scan-0.5.4
```

- [ ] 用 npm 更新直接依赖与 lockfile：

```sh
npm install "@unif/react-native-hms-scan@^0.5.4" --save
```

Expected: `package.json` 为 `^0.5.4`，`package-lock.json` 与 `node_modules` 都解析到 `0.5.4`。

- [ ] 验证 npm 安装结果不再包含易失 vendor 目录：

```sh
node -p "require('./node_modules/@unif/react-native-hms-scan/package.json').version"
test ! -d node_modules/@unif/react-native-hms-scan/ios/vendor
test ! -e node_modules/@unif/react-native-hms-scan/scripts/prepare-scankit-xcframework.sh
```

Expected: 输出 `0.5.4`，两个 `test` 都成功。

- [ ] 让 CocoaPods 读取新 podspec；不删除整个 Pods，不修改宿主 Podfile：

```sh
cd ios
bundle install
bundle exec pod install --repo-update
cd ..
```

Expected: 安装 `ReactNativeHmsScan (0.5.4)` 与 `ScanKitFrameWork (1.1.2.305)`。

- [ ] 核对 lockfile：

```sh
rg -n "ReactNativeHmsScan \\(0\\.5\\.4\\)|ScanKitFrameWork \\(1\\.1\\.2\\.305\\)" ios/Podfile.lock
```

Expected: 两个精确版本均命中，`ReactNativeHmsScan` 的依赖列表包含 `ScanKitFrameWork (= 1.1.2.305)`。

- [ ] 运行 Portal 的非原生回归验证：

```sh
npm run lint
npx tsc --noEmit
npm test -- --runInBand
```

Expected: 全部通过；没有改动共享 `src/`，网站平台无新增依赖。

- [ ] 连接名为 `llj` 的 iPhone，执行与用户原命令一致的真机 Debug build/install：

```sh
npm run ios -- --device llj
```

Expected: 不再出现 `'ScanKitFrameWork/ScanKitFrameWork.h' file not found`，Xcode build 成功并在真机打开 PecPortal。不要用 Simulator 作为替代验收。

- [ ] 在真机执行最小运行时验收：

  1. 打开扫码页面并授予相机权限；
  2. 扫一个 QR code，确认返回值和确认流程正常；
  3. 从本地图片执行 `decodeImage`，确认有码返回结果、无码返回 `[]`；
  4. 退出并再次进入扫码页，确认相机生命周期正常。

- [ ] 检查 Portal diff 只包含三个依赖文件：

```sh
git diff --check
git status --short
git diff -- package.json package-lock.json ios/Podfile.lock
```

- [ ] 提交并创建 Portal PR：

```sh
git add package.json package-lock.json ios/Podfile.lock
git commit -m "fix(ios): adopt device-only ScanKit integration"
gh pr create --base main --head fix/hms-scan-0.5.4 --title "fix(ios): 升级 ScanKit 真机专用集成" --body "升级 @unif/react-native-hms-scan 0.5.4，恢复官方 ScanKitFrameWork CocoaPod，并完成 llj 真机构建与扫码验收。"
```

---

## Definition of Done

- [ ] npm 发布包通过官方 Pod 精确依赖 `ScanKitFrameWork 1.1.2.305`。
- [ ] npm tarball 不包含 Huawei 二进制、旧生成脚本或 `ios/vendor`。
- [ ] 库 CI 每次相关变更都真实执行 generic-device、无签名的 iOS build。
- [ ] 活文档与 hms-scan Skill 都明确“iOS 仅真机，Simulator 不支持”。
- [ ] Skill 仓与库仓各自 CI 全绿，版本/marketplace 处理符合各自惯例。
- [ ] `@unif/react-native-hms-scan@0.5.4` 已发布并通过 tarball 审计。
- [ ] Portal lockfile 固定到库 `0.5.4` 和 Pod `1.1.2.305`。
- [ ] PecPortal 在 `llj` 真机完成 build、启动、扫码和 `decodeImage` 验收。
