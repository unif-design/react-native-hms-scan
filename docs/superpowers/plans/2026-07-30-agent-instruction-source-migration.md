# Agent Instruction Source Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将完整仓库指令迁移到 `AGENTS.md`,让 `CLAUDE.md` 只导入它,并把本库对应的 `hms-scan` Skill 路径与同步规则写成可执行规范。

**Architecture:** `AGENTS.md` 成为唯一真相源,`CLAUDE.md` 只保留单行导入;消费者文档统一使用当前 Skill 名称、安装命令和 GitHub 路径。Sibling Skills 仓只做影响核对,因为本次不改变公开 API 或消费者行为。

**Tech Stack:** Markdown、Git、ripgrep、POSIX shell assertions、Yarn 4.11、Docusaurus

## Global Constraints

- 必须在分支 `docs/migrate-agent-instructions` 上实施,不得修改 `main`。
- 文件名固定使用大写 `AGENTS.md` 和 `CLAUDE.md`。
- `AGENTS.md` 必须保留当前 `CLAUDE.md` 中的仓库定位、命令、架构、平台差异、错误语义、测试和注释风格等强约束。
- `CLAUDE.md` 内容必须精确为一行 `@AGENTS.md`,不得包含 H1、解释文字或反向链接。
- 本次不改变库 API、原生实现或消费者行为。
- sibling Skills 仓相对本仓为 `../skills/`,本库对应目录为 `../skills/skills/hms-scan/`。
- sibling Skills 仓当前有其他未提交改动;不得覆盖、暂存或提交它们。
- 本次不修改 `../skills/skills/hms-scan/` 的六个文件,也不 bump `metadata.version`;必须完成只读影响核对并在交付中说明理由。
- 迁移前 `yarn test --runInBand` 基线为 22 个测试通过、1 个测试失败;既有失败位于 `src/__tests__/Scanner.test.tsx:36`。

---

## 文件结构

- `AGENTS.md`: 完整仓库级 Agent 指令和库改动后的文档 / Skill 联动检查。
- `CLAUDE.md`: Claude Code 对 `AGENTS.md` 的单行导入。
- `README.md`: 面向使用者的当前 Agent Skill 名称与安装命令。
- `website/docs/skills.md`: 文档站中的当前 Skill 名称、安装命令和 GitHub 源码链接。
- `docs/superpowers/specs/2026-07-30-agent-instruction-source-migration-design.md`: 已批准设计,只读参考。
- `docs/superpowers/plans/2026-07-30-agent-instruction-source-migration.md`: 本实施计划。
- `../skills/skills/hms-scan/`: sibling 消费侧 Skill,本次只读核对。

### Task 1: 迁移 Agent 指令并写清 Skill 联动规则

**Files:**

- Modify: `AGENTS.md:1-3`
- Modify: `CLAUDE.md:1-137`
- Read only: `../skills/skills/hms-scan/SKILL.md`
- Read only: `../skills/skills/hms-scan/assets/ScannerScreen.tsx`
- Read only: `../skills/skills/hms-scan/references/native-setup.md`
- Read only: `../skills/skills/hms-scan/references/troubleshooting.md`
- Read only: `../skills/skills/hms-scan/scripts/doctor.sh`
- Read only: `../skills/skills/hms-scan/scripts/doctor.test.sh`

**Interfaces:**

- Consumes: 当前 `CLAUDE.md` 的完整正文;已批准设计文档;本地 sibling 路径 `../skills/skills/hms-scan/`。
- Produces: 完整权威源 `AGENTS.md`;内容精确为 `@AGENTS.md\n` 的 `CLAUDE.md`;可执行的 Skill 影响检查规则。

- [ ] **Step 1: 运行迁移前结构断言并确认它失败**

Run:

```sh
test "$(wc -l < CLAUDE.md | tr -d ' ')" -eq 1 \
  && grep -Fxq '@AGENTS.md' CLAUDE.md \
  && ! rg -n 'CLAUDE\.md' AGENTS.md
```

Expected: FAIL。当前 `CLAUDE.md` 有 137 行,且 `AGENTS.md` 仍反向引用它。

- [ ] **Step 2: 用 `apply_patch` 将当前指令正文迁入 `AGENTS.md`**

以当前 `CLAUDE.md` 为内容源执行以下确定性变换:

```text
1. 用 CLAUDE.md 当前全部内容替换 AGENTS.md。
2. 把首行 "# CLAUDE.md" 改为 "# AGENTS.md"。
3. 保留“仓库定位”到“仓库内注释风格”的全部现有章节和强约束。
4. 用下方完整内容替换原“## 文档与 skill 同步”章节。
```

新章节的完整内容:

```markdown
## 文档与 Skill 联动检查

每次改完库都要判断 website docs、llms.txt 和消费侧 Skill 是否需要同步;不要只在新增
API 时检查。纯内部重构也必须完成核对,无需修改时在交付结果中写明理由。

### 文档数据源

- **API / props / 类型全量** → 同步 `website/docs/`,再运行
  `website/scripts/build-llms.js` 重生成 llms;website docs 是 llms.txt 的唯一来源。
- **远程入口** → 文档站 https://unif-design.github.io/react-native-hms-scan/、
  llms 索引 https://unif-design.github.io/react-native-hms-scan/llms.txt、
  llms 全文 https://unif-design.github.io/react-native-hms-scan/llms-full.txt。

### 本库对应 Skill 的精确位置

- **Skills 仓** → 相对本仓 `../skills/`;当前本机绝对路径
  `/Users/liulijun/tongyi/design/skills/`。
- **本库 Skill** → `hms-scan`;相对本仓 `../skills/skills/hms-scan/`;当前本机绝对路径
  `/Users/liulijun/tongyi/design/skills/skills/hms-scan/`。
- **入口** → `../skills/skills/hms-scan/SKILL.md`。
- **不要使用旧路径** → `skills/unif-hms-scan/` 已不存在。
- **安装** → `/plugin marketplace add unif-design/skills` 后运行
  `/plugin install unif@skills`。

检查 `../skills/skills/hms-scan/` 下与本库对应的全部文件:

| 文件 | 何时同步 |
| --- | --- |
| `SKILL.md` | `Scanner` / `HmsScanView` / `decodeImage` API、码制、mock、文档 URL 或关键语义变化 |
| `assets/ScannerScreen.tsx` | `<Scanner>` 快速开始示例或确认流程变化 |
| `references/native-setup.md` | peer dependencies、minSdk、新架构、Manifest、权限或 iOS 配置变化 |
| `references/troubleshooting.md` | 平台差异、事件、URI、错误码或排障结论变化 |
| `scripts/doctor.sh` | 可自动检测的宿主依赖或原生配置变化 |
| `scripts/doctor.test.sh` | `doctor.sh` 检查项或三态输出变化 |

### 改动后的执行顺序

1. 判断改动是否影响公开 API、示例、平台配置、错误语义、依赖、测试 mock 或文档 URL。
2. 同步 `website/docs/` 并按需重生成 llms。
3. 逐项核对 `../skills/skills/hms-scan/` 的六个文件;只修改被当前改动影响的文件。
4. 若修改 `doctor.sh`,必须同步 `doctor.test.sh`。
5. 验证 sibling Skill;不得因为 Skills 仓已有其他未提交改动而覆盖或提交无关文件。
6. 交付时说明 website / llms / Skill 的核对结果;无需修改也要写明理由。

作为消费者接入时优先使用 `hms-scan` Skill 中经核实的 API、原生配置与排障结论。
CI / 发版 / 依赖管理 / branch protection 的配置与排查 SOP 见
https://github.com/unif-design/.github/blob/main/AUTOMATION.md,本仓约定亦见 `README.md`
与 `.github/`。
```

- [ ] **Step 3: 用 `apply_patch` 将 `CLAUDE.md` 缩减为单行导入**

用以下精确内容替换文件:

```markdown
@AGENTS.md
```

文件结尾保留一个换行符。

- [ ] **Step 4: 运行 Agent 指令结构与内容检查**

Run:

```sh
test "$(wc -l < CLAUDE.md | tr -d ' ')" -eq 1
grep -Fxq '@AGENTS.md' CLAUDE.md
! rg -n 'CLAUDE\.md' AGENTS.md
rg -Fq '## 仓库定位' AGENTS.md
rg -Fq '## 常用命令' AGENTS.md
rg -Fq '## 架构与约定' AGENTS.md
rg -Fq '## 关键坑' AGENTS.md
rg -Fq '## 测试' AGENTS.md
rg -Fq '## 文档与 Skill 联动检查' AGENTS.md
rg -Fq '## 仓库内注释风格' AGENTS.md
rg -Fq '../skills/skills/hms-scan/' AGENTS.md
rg -Fq '/Users/liulijun/tongyi/design/skills/skills/hms-scan/' AGENTS.md
```

Expected: 所有命令退出码为 0;`AGENTS.md` 不反向引用 `CLAUDE.md`。

- [ ] **Step 5: 核对 sibling Skill 六个文件且确认本次不修改**

Run:

```sh
test -f ../skills/skills/hms-scan/SKILL.md
test -f ../skills/skills/hms-scan/assets/ScannerScreen.tsx
test -f ../skills/skills/hms-scan/references/native-setup.md
test -f ../skills/skills/hms-scan/references/troubleshooting.md
test -f ../skills/skills/hms-scan/scripts/doctor.sh
test -f ../skills/skills/hms-scan/scripts/doctor.test.sh
test ! -e ../skills/skills/unif-hms-scan
git -C ../skills status --short -- skills/hms-scan
```

Expected: 六个新路径都存在,旧目录不存在,最后一条命令无输出。因为本次仅迁移仓库指令,
`hms-scan` 的 API、示例、原生配置、排障与 doctor 行为均未改变。

- [ ] **Step 6: 检查并提交核心迁移**

Run:

```sh
git diff --check
git diff -- AGENTS.md CLAUDE.md
git add AGENTS.md CLAUDE.md
git commit -m "docs: move agent instructions to AGENTS"
```

Expected: diff 只包含指令迁移、Skill 联动规则和单行导入;提交成功。

### Task 2: 对齐消费者文档中的当前 Skill 标识并完成全量验证

**Files:**

- Modify: `README.md:55`
- Modify: `website/docs/skills.md:3-46`
- Verify: `AGENTS.md`
- Verify: `CLAUDE.md`
- Read only: `../skills/skills/hms-scan/`

**Interfaces:**

- Consumes: Task 1 生成的 `AGENTS.md` 与 `CLAUDE.md`;Skills 仓当前名称 `hms-scan`;插件安装目标 `unif@skills`。
- Produces: 使用 `hms-scan`、`skills/hms-scan/`、`unif@skills` 的 README 和文档站页面;完整验证记录。

- [ ] **Step 1: 运行旧 Skill 标识检查并确认它失败**

Run:

```sh
! rg -n 'unif-hms-scan|unif@unif-skills' README.md website/docs/skills.md
```

Expected: FAIL。当前 README 和文档站仍包含旧 Skill 名称、安装目标和 GitHub 路径。

- [ ] **Step 2: 用 `apply_patch` 修正 README 的 Skill 名称和安装命令**

将 `README.md` 文档章节中的 Agent Skill 行精确改为:

```markdown
- **Agent Skill** `hms-scan`(`unif` plugin):`/plugin marketplace add unif-design/skills` → `/plugin install unif@skills`
```

- [ ] **Step 3: 用 `apply_patch` 修正文档站 Skill 页面**

只做以下确定性替换,保留 `@unif/react-native-hms-scan` 包名:

```text
frontmatter description: "hms-scan 是一个 Agent Skill,..."
H1: "# AI Skill：hms-scan"
介绍段: "`hms-scan` 是一个 **Agent Skill**,..."
安装命令: "/plugin install unif@skills"
GitHub 标签: "github.com/unif-design/skills · hms-scan"
GitHub URL: "https://github.com/unif-design/skills/tree/main/skills/hms-scan"
```

- [ ] **Step 4: 运行旧标识和路径一致性检查**

Run:

```sh
! rg -n 'unif-hms-scan|unif@unif-skills' AGENTS.md README.md website/docs/skills.md
rg -Fq '`hms-scan`' README.md
rg -Fq '# AI Skill：hms-scan' website/docs/skills.md
rg -Fq '/plugin install unif@skills' AGENTS.md README.md website/docs/skills.md
rg -Fq 'skills/hms-scan' website/docs/skills.md
```

Expected: 所有命令退出码为 0;包名 `@unif/react-native-hms-scan` 保持不变。

- [ ] **Step 5: 构建文档站**

Run:

```sh
yarn workspace @unif/react-native-hms-scan-website build
```

Expected: Docusaurus build 成功,`website/scripts/build-llms.js` 同时成功运行。

- [ ] **Step 6: 验证 sibling Skills 仓**

Run:

```sh
git -C ../skills diff --exit-code -- skills/hms-scan
python3 ../skills/scripts/validate_repository.py
bash ../skills/skills/hms-scan/scripts/doctor.test.sh
```

Expected:

- `skills/hms-scan/` 相对其 HEAD 无变化。
- Skills 仓结构验证成功。
- `doctor.test.sh` 的自包含 fixtures 全部通过。

- [ ] **Step 7: 运行本仓最终检查并记录已知基线失败**

Run:

```sh
git diff --check
yarn typecheck
yarn test --runInBand
```

Expected:

- `git diff --check` 和 `yarn typecheck` 退出码为 0。
- Jest 不出现新增失败;若仍失败,只能是迁移前已经确认的
  `src/__tests__/Scanner.test.tsx:36`。预期统计与基线一致:3 个 suite 通过、1 个 suite
  失败,22 个测试通过、1 个测试失败。

- [ ] **Step 8: 检查并提交消费者文档**

Run:

```sh
git diff --check
git diff -- README.md website/docs/skills.md
git add README.md website/docs/skills.md
git commit -m "docs: align hms-scan skill references"
git status --short
```

Expected: diff 只包含 Skill 名称、安装命令和 GitHub 路径更新;提交成功;工作区干净。

## 最终交付记录

交付说明必须包含:

- 当前分支和两个实施 commit。
- `AGENTS.md` 为唯一真相源、`CLAUDE.md` 为单行导入的验证结果。
- `../skills/skills/hms-scan/` 六个文件的核对结果,以及“本次不改 Skill”的理由。
- README / website Skill 旧标识已清除。
- Docusaurus、typecheck、Skills validator 和 doctor test 的实际结果。
- Jest 的实际结果,明确区分迁移前既有失败与本次回归。
- Skills 审计发现但未纳入本任务的既有 API 描述漂移,作为后续事项列出。
