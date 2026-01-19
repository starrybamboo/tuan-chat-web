# 变更提案: Blocksuite @ 菜单标题使用 tc_header

## 需求背景
当前 TuanChat 的 @ 弹窗（linked-doc 菜单）使用 workspace.meta 标题，可能显示 Untitled 或内置标题，与业务侧 tc_header 不一致。需要在弹窗打开时直接读取 tc_header 作为标题来源，并保证搜索与展示一致。

## 变更内容
1. 在 @ 菜单构建阶段读取 doc 的 tc_header.title，作为列表显示与搜索的唯一标题来源。
2. 缺失 tc_header 的 doc 显示空标题，不回退 Untitled/内置标题。
3. 通过更新 workspace.meta 同步 tc_header，保持后续引用显示一致。

## 影响范围
- 模块: blocksuite
- 文件: app/components/chat/infra/blocksuite/embedded/createEmbeddedAffineEditor.client.ts
- API: 无
- 数据: 无

## 核心场景

### 需求: @ 菜单标题使用 tc_header
**模块:** blocksuite
@ 弹窗展示文档列表时标题来源必须为 tc_header。

#### 场景: 打开 @ 弹窗即显示 tc_header
前置条件: doc 已存在 tc_header
- 预期结果: 列表项标题为 tc_header.title

#### 场景: 缺失 tc_header 不回退
前置条件: doc 未写入 tc_header
- 预期结果: 列表项显示空标题，不显示 Untitled 或内置标题

#### 场景: 搜索使用 tc_header
前置条件: 输入关键词搜索
- 预期结果: 搜索匹配以 tc_header.title 为准

## 风险评估
- 风险: 读取 tc_header 需要加载 doc，可能增加 @ 弹窗打开耗时。
  - 缓解: 使用缓存与短 TTL，避免重复加载。
