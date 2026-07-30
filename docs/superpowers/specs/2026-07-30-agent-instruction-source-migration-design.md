# Agent 指令单一真相源迁移设计

## 目标

将仓库级 AI coding agent 指令的单一真相源从 `CLAUDE.md` 迁移到
`AGENTS.md`,让 Codex、Claude Code、Cursor 等 Agent 读取同一份规范。
迁移后:

- `AGENTS.md` 保存完整仓库指令。
- `CLAUDE.md` 只保留 `@AGENTS.md`。
- `AGENTS.md` 明确本库对应的 sibling Skill 路径、检查范围、同步触发条件和验证要求。
- 本仓所有面向消费者的 Skill 名称、安装命令和链接与当前 Skills 仓保持一致。

## 现状与约束

- 当前 `CLAUDE.md` 是完整指令源,`AGENTS.md` 反向链接它;迁移必须先写入
  `AGENTS.md`,再替换 `CLAUDE.md`,避免循环引用或正文丢失。
- 文件名固定使用大写 `AGENTS.md` 和 `CLAUDE.md`。
- 现有仓库定位、命令、架构、平台差异、错误语义、测试和注释风格等强约束必须保留。
- 本次不改变库 API、原生实现或消费者行为。
- sibling Skills 仓已有未提交改动;本任务只读核对对应 Skill,不覆盖其工作区。
- `yarn test --runInBand` 的迁移前基线为 22 个测试通过、1 个测试失败。失败位于
  `src/__tests__/Scanner.test.tsx:36`,不属于本次文档迁移范围。

## 方案选择

采用“`AGENTS.md` 单一真相源 + `CLAUDE.md` 导入 + 精确 Skill 映射”方案。

未采用原样搬运,因为它会保留已过时的 Skill 名称和模糊的同步规则;未采用拆分额外
Agent 文档,因为会增加跳转层级和维护源。

## 文件职责

### `AGENTS.md`

承接并重构当前 `CLAUDE.md` 全部有效内容,H1 改为 `# AGENTS.md`。其中“文档与
Skill 同步”改成可执行的联动检查:

1. 每次修改库后先判断是否影响公开 API、示例、平台配置、错误语义、依赖、测试 mock
   或文档 URL。
2. 明确定位 sibling Skills 仓:
   - 相对本仓: `../skills/`
   - 当前本机绝对路径: `/Users/liulijun/tongyi/design/skills/`
   - 本库对应 Skill: `../skills/skills/hms-scan/`
   - 当前本机绝对路径:
     `/Users/liulijun/tongyi/design/skills/skills/hms-scan/`
3. 明确检查对应 Skill 的六个文件:
   - `SKILL.md`
   - `assets/ScannerScreen.tsx`
   - `references/native-setup.md`
   - `references/troubleshooting.md`
   - `scripts/doctor.sh`
   - `scripts/doctor.test.sh`
4. 按改动类型决定同步目标:
   - `Scanner` API / 确认流程 → `SKILL.md`;示例变化时再改
     `assets/ScannerScreen.tsx`。
   - `HmsScanView` 事件 / torch 平台语义 → `SKILL.md` 和
     `references/troubleshooting.md`。
   - `decodeImage` 签名 / URI / 错误 / 空数组语义 → `SKILL.md` 和
     `references/troubleshooting.md`;权限变化再改 `references/native-setup.md`。
   - peer dependencies / minSdk / 新架构 / Manifest / iOS 配置 →
     `references/native-setup.md`、`scripts/doctor.sh` 和
     `scripts/doctor.test.sh`。
   - 码制清单、官方 mock、文档 URL → `SKILL.md` 对应章节。
   - 纯内部重构或仓库指令迁移 → 核对后可不改 Skill。
5. 交付时必须说明 Skill 核对结果;如果无需修改,也要写明理由。

### `CLAUDE.md`

文件内容精确为:

```markdown
@AGENTS.md
```

不得包含 H1、解释文字或反向链接。

### `README.md` 与 `website/docs/skills.md`

修正本次审计直接发现的旧 Skill 标识:

- `unif-hms-scan` → `hms-scan`
- `skills/unif-hms-scan/` → `skills/hms-scan/`
- `/plugin install unif@unif-skills` → `/plugin install unif@skills`

这些修改只对齐已经发生的 Skills 仓重命名,不改写库 API 文档。

### sibling `../skills/skills/hms-scan/`

本次迁移不改变消费者能力,因此六个对应文件无需修改,也不 bump
`metadata.version`。实施结束前仍执行只读 diff 和路径检查,并在交付中记录结论。

## 验证

- 确认当前分支为 `docs/migrate-agent-instructions`,且 `main` 未被修改。
- 确认 `CLAUDE.md` 只有一行 `@AGENTS.md`。
- 确认 `AGENTS.md` 不再引用 `CLAUDE.md`,避免循环。
- 检查本仓不再出现 `unif-hms-scan`、`skills/unif-hms-scan` 或
  `unif@unif-skills`。
- 确认 `../skills/skills/hms-scan/SKILL.md` 存在,且旧目录不存在。
- 对 sibling Skill 六个文件执行只读核对,确认本次无需同步。
- 运行 `git diff --check`。
- 运行文档相关检查;完整 Jest 结果同时标注迁移前基线失败,不将其误报为本次回归。

## 非目标与后续事项

Skills 审计发现若干既有 API 描述可能与当前原生实现漂移。它们不是本次“Agent 指令
真相源迁移”造成的问题,不在本分支混改;交付时单独列出,由后续任务结合实现与测试处理。
