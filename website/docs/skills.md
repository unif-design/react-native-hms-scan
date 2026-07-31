---
title: AI Skill
description: "hms-scan 是一个 Agent Skill,教 AI 编码助手正确调用 @unif/react-native-hms-scan 的 API、避免常见幻觉。"
---

# AI Skill：hms-scan

## 这是什么

`hms-scan` 是一个 **Agent Skill**,教 AI 编码助手(Claude Code / Cursor / Codex)正确调用 `@unif/react-native-hms-scan` 的 API、避免常见幻觉。

它把这个华为 HMS 扫码库的关键约定、易错点和参考索引打包给 AI,让助手在你的项目里写代码时按真实 API 来,而不是凭记忆瞎猜。

## 覆盖什么

**何时会触发:** 用 `@unif/react-native-hms-scan` 扫二维码 / 条码——现成扫码页 / headless 自定义扫码 UI / 从图片解码,或排查 iOS 真机 / Simulator 支持边界、Android Huawei Maven、`decodeImage` 返回空数组。

**覆盖的能力:**

- 三种用法:现成 `<Scanner>` 屏、headless `<HmsScanView>`、从图片 `decodeImage`。
- `decodeImage` 输入约定:两端支持 `file://` / 绝对路径;Android 另支持 `content://` / `android.resource://`,iOS 另支持 `data:`;空数组 = 图里没码(不是错误)。
- 条码格式(14 种)、`formats` 省略 = 全部。
- 易错点:漏配宿主 Huawei Maven、用远程 URL 调 `decodeImage`、把空数组当错误、把 iOS Simulator 当作受支持的原生目标。iOS 使用官方 `ScanKitFrameWork 1.1.2.305` CocoaPod,且只支持真机;无硬件 JS 逻辑使用随包 Jest mock。

> 内置引擎非华为机也能用、无需 agconnect / API Key;但宿主必须添加 Huawei Maven。拍照 / 录像请走 camera skill。

## 如何安装

**Claude Code 插件市场:**

```bash
/plugin marketplace add unif-design/skills
/plugin install unif@skills
```

**或用 skills CLI:**

```bash
npx skills add unif-design/skills
```

## 在 GitHub 查看

skills 全部开源,发布在插件市场仓库 `unif-design/skills`。本 skill 的源码与参考文档:

👉 **[github.com/unif-design/skills · hms-scan](https://github.com/unif-design/skills/tree/main/skills/hms-scan)**

---

装了之后,在你的项目里让 AI 写 `@unif/react-native-hms-scan` 代码会更准。
