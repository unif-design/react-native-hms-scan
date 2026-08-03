# Scanner 扫码 Session Generation 设计

## 背景

`<Scanner>` 已使用 `processingRunRef` 阻止 pending `pickImage`、`decodeImage` 和
`resolveProduct` 在 fatal / denied 后覆盖新 phase，也使用
`acceptingResultsRef` 在错误发生后立即关闭结果入口。

现有 boolean gate 仍不能区分不同扫码会话：

1. 旧 `<HmsScanView>` 的 `onScanResult` callback 捕获了当时的
   `phase === 'scan'`。
2. fatal / denied 会把共享 `acceptingResultsRef` 设为 `false`。
3. retry、设置授权恢复或 reset 进入新一轮 `scan` 时，共享 boolean 又变为
   `true`。
4. 此时才到达的旧 callback 会读取新的 `true`，自行创建当前 processing run，
   从而把上一会话的结果送入新会话。

这个问题属于跨会话身份缺失，而不是 processing await 校验不足。

## 目标

- fatal → retry、denied → 设置授权恢复、success / fail → reset 后，上一扫码
  session 的迟到 callback 必须被拒绝。
- 当前 session 的 callback 仍能正常进入 `detecting`、解析并展示或确认结果。
- 已有 processing generation、权限 generation、相册串行化和错误路由语义保持不变。
- 不修改公共 API、原生组件接口、website 或 Skill 契约。

## 方案比较

### 方案 A：callback 捕获单调递增的 session generation（采用）

为每次进入 `scan` 分配新的 session id。ref 保存当前有效 id，以便 fatal / denied /
retry / unmount 同步失效；state 保存本轮 id，使 React 为新一轮渲染创建捕获该 id 的
`onCameraResult` callback。callback 同时校验“捕获 id 等于当前 ref”后才能接收结果。

优点：

- 能识别 callback 属于哪一轮扫码，而不只判断当前是否开放。
- 无需修改 Fabric event payload 或原生代码。
- 与已有 permission / processing generation 模式一致。

代价：

- 每次进入 `scan` 多一次同批 state 更新。
- 必须同时维护 ref 与 state：ref 提供同步失效，state 提供闭包身份。

### 方案 B：给 `<HmsScanView>` 增加 `key` 强制 remount

remount 可以销毁旧原生 view，但已经进入 JS 队列或被旧 render 保存的 callback 仍可在
新 view 挂载后执行。它不能独立证明旧事件被拒绝，而且会增加相机重建成本。

### 方案 C：让原生事件携带 native session id

Android / iOS 原生 view 可为每次 lifecycle 生成 id 并随事件上报，但这会扩大 Fabric
schema、双端原生实现和公共内部协议。本缺陷在 JS 层已有足够身份信息，不需要扩大范围。

## 详细设计

### Session 身份

`ScannerInner` 增加：

- `scanSessionRef`：当前有效 session 的单调 generation。
- `scanSession` state：当前 render 应捕获的 session id。

新增两个内部动作：

- `invalidateScanSession()`：递增 ref，立即使所有旧 callback 失效，并关闭共享结果入口。
- `enterScan()`：先使旧 processing 失效并释放 handling lock，再分配新的 session id，
  同步写入 ref、排队更新 state，最后进入 `scan`。

fatal、denied、retry 和 unmount 都调用 session 失效动作。reset 通过 `enterScan()`
直接结束旧 session 并创建新 session。权限成功恢复也通过同一个 `enterScan()` 创建新
session。

### 结果入口

`onCameraResult` 捕获当前 render 的 `scanSession`，处理前依次校验：

1. 捕获的 session id 仍等于 `scanSessionRef.current`。
2. 闭包 phase 是 `scan`。
3. 当前 session 的结果入口仍开放。
4. 当前没有其他处理链持锁。
5. results 中存在第一个有效命中。

通过后才关闭入口、占用 handling lock、创建 processing run 并进入 `finalize`。

共享 boolean 继续承担同一 session 内的同步防重入；session generation 负责跨 session
身份隔离。两者职责不同，不能互相替代。

### 状态恢复

- retry：先失效旧 session，进入 `init` 并重新跑权限；权限成功后创建新 session。
- 设置授权恢复：denied 已失效旧 session；AppState 复查成功后创建新 session。
- reset / 重扫：直接创建新 session。
- unmount：同步失效 session、permission run 和 processing run。

旧 callback 即使在上述恢复完成后才执行，其捕获 id 仍与当前 ref 不同，因此不会改变
phase、调用 `resolveProduct` 或触发 `onConfirm`。

## 测试设计

在 `src/__tests__/Scanner.test.tsx` 增加行为测试，测试必须先以当前实现稳定失败：

1. capture 旧 camera callback → fatal → retry 成功 → 调旧 callback：
   - 保持新 `scan`；
   - 不调用 `resolveProduct` / `onConfirm`；
   - 当前 callback 随后仍可成功扫码。
2. capture 旧 callback → `E_NO_CAMERA_PERMISSION` → 设置返回并授权 → 调旧 callback：
   - 仍保持恢复后的 `scan`；
   - 当前 callback 可正常扫码。
3. capture 旧 callback → 扫码成功 → 重扫进入新 session → 调旧 callback：
   - 不接受旧结果；
   - 当前 callback 可正常扫码。

测试通过 UI phase、宿主回调和新 callback 可用性验证行为，不断言内部 ref 或 generation
数值。

## 文档与交付

- 更新 `AGENTS.md` 的 Scanner 竞态与测试说明，记录跨 session callback 必须按 generation
  拒绝的内部维护约束。
- 公共 API、用户可见错误语义和既有 website / Skill 文案不变，因此不修改 README、
  website、llms 或 hms-scan Skill。
- 验证至少包括目标 Scanner 测试、完整 Jest、typecheck、lint、prepare 和现有 Android /
  iOS integration contracts。
- 不 push、merge、创建 PR、release 或执行真机 smoke。
