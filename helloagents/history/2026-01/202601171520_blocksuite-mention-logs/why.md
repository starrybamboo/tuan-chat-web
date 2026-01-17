# 变更提案: Blocksuite @ 提及日志补强

## 需求背景
开发环境使用 @ 提及时仍无日志输出，需要补齐日志触发链路以定位为何未进入菜单/插入逻辑。

## 变更内容
1. 在 Blocksuite 描述编辑器入口增加日志，确认是否命中 createEmbeddedAffineEditor 路径。
2. 在菜单创建与插入逻辑中补齐日志（保持仅开发环境输出）。

## 影响范围
- 模块: Blocksuite 描述编辑器、提及集成
- 文件: app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx, app/components/chat/infra/blocksuite/embedded/createEmbeddedAffineEditor.client.ts, app/components/chat/infra/blocksuite/services/mentionPicker.ts
- API: 无
- 数据: 无

## 核心场景

### 需求: @ 提及日志可见
**模块:** Blocksuite 描述编辑器
在空间描述中触发 @ 提及时，控制台能看到入口、菜单请求、选择、插入相关日志。

#### 场景: 空间描述触发 @
前置条件: 空间描述编辑器已打开，输入 `@` 并出现成员弹窗。
- 预期结果: 控制台出现 `[BlocksuiteMentionHost]`、`[BlocksuiteMentionMenu]`、`[BlocksuiteMention]` 日志。

## 风险评估
- 风险: 调试日志在开发环境过多。
- 缓解: 仅在 `import.meta.env.DEV` 输出。
