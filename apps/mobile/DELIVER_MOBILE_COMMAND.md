# 移动端跑团快捷命令补全 — 交付包

## 交付概述

移动端从"只能发送基础指令请求"升级为接近桌面端的可用跑团快捷命令能力。

| 能力 | 交付前 | 交付后 |
|------|--------|--------|
| 命令候选面板 | 无 | 输入 `.` / `。` / `/` 开头时显示候选 |
| 全员检定请求 | 需手动切换 COMMAND_REQUEST 模式 | KP 在 TEXT 模式输入 `@all .rc 侦查` 自动发送 |
| COMMAND_REQUEST 卡片 | 仅显示纯文本 | 专用卡片，显示命令、全员标记、可执行按钮 |
| 点击执行 | 不支持 | 点击后发送命令文本，骰娘系统处理 |
| 一次性执行保护 | 不支持 | 同一请求同一用户只能执行一次 |

---

## 新建文件

| 文件 | 用途 |
|------|------|
| `packages/tuanchat-domain/src/command-request.ts` | 共享纯函数：`isCommand`、`containsCommandRequestAllToken`、`stripCommandRequestAllToken`、`extractFirstCommandText` |
| `packages/tuanchat-domain/src/command-request.test.ts` | 23 条单元测试 |
| `packages/tuanchat-domain/src/command-catalog.ts` | 静态命令元数据目录（Public/CoC/DnD/Fu/Pokemon） |
| `apps/mobile/src/features/chat/MobileCommandPanel.tsx` | 命令候选面板组件 |
| `apps/mobile/src/features/chat/CommandRequestCard.tsx` | COMMAND_REQUEST 卡片组件 + 禁用条件计算 |
| `apps/mobile/src/features/messages/commandRequestStorage.ts` | 平台感知一次性执行存储（Native: SecureStore / Web: localStorage） |
| `apps/mobile/src/features/messages/useMobileCommandRequests.ts` | 执行 hook：消费记录、权限校验、发送命令 |

## 修改文件

| 文件 | 变更 |
|------|------|
| `packages/tuanchat-domain/package.json` | 新增 `./command-request`、`./command-catalog` 导出 |
| `app/components/common/dicer/cmdPre.tsx` | `isCommand` 改为从共享包 re-export |
| `app/components/chat/room/useRoomCommandRequests.ts` | 三个纯函数改为委托共享包实现 |
| `apps/mobile/src/features/chat/ChatShell.tsx` | 接入 `useMobileCommandRequests`；TEXT 模式发送前检测 @all + 命令；传递 `ruleId` 和执行 props |
| `apps/mobile/src/features/chat/ChatComposer.tsx` | 新增 `ruleId` prop；渲染 `MobileCommandPanel`（与 mention list 互斥） |
| `apps/mobile/src/features/chat/ChatMessageList.tsx` | 透传 command request 相关 props |
| `apps/mobile/src/features/chat/ChatMessageItem.tsx` | messageType 12 渲染 `CommandRequestCard` |

---

## 验证结果

```
pnpm mobile:typecheck   → 通过（0 errors）
pnpm test               → 178 test files, 859 tests passed
```

---

## 设计决策

1. **命令不在移动端本地执行** — "执行"= 发送命令文本作为普通消息，由骰娘系统处理。避免在移动端引入整套 dicer 执行器。
2. **命令目录为静态数据** — 从各 executor 文件提取 name/alias/description/examples/usage，不引入执行器依赖。
3. **一次性执行存储使用 expo-secure-store** — Native 端不依赖 `window.localStorage`，遵循项目现有 `auth-storage.ts` 模式。
4. **共享函数下沉到 `@tuanchat/domain`** — 桌面端和移动端统一引用，避免逻辑复制。

---

## 非目标（未做）

- 不重写骰子规则
- 不改变后端消息协议
- 不引入新的"V2"并行指令系统
- 不处理 Thread 完整接入
- 不改 `.env*`

---

## 推荐提交信息

```
feat(mobile): support trpg quick commands

- Extract shared command-request functions to @tuanchat/domain
- Add static command catalog for autocomplete panel
- Mobile command candidate panel on ./。/ prefix
- KP can send @all command requests in TEXT mode
- Render COMMAND_REQUEST cards with one-time execution protection
- Execute commands by sending text for dicer system to process
```
