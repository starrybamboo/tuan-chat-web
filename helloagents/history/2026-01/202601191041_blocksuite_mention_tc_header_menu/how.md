# 技术设计: Blocksuite @ 菜单标题使用 tc_header

## 技术方案
### 核心技术
- Blocksuite linked-doc 菜单扩展（LinkedWidgetConfigExtension）
- tc_header（Yjs map）读取

### 实现要点
- 在 `createEmbeddedAffineEditor.client.ts` 的 `getMenus` 中自建 doc 列表：
  - 基于 `workspace.meta.docMetas` 获取 docId 列表
  - 读取对应 doc 的 tc_header.title 作为显示/搜索标题
  - 缺失时返回空字符串，避免 Untitled 回退
- 使用短 TTL 缓存 tc_header 结果，避免频繁加载 doc。
- 保留 room doc 的过滤逻辑与 member 列表逻辑。
- 同步更新 workspace.meta.title 为 tc_header，保证后续引用显示一致。

## 架构设计
无架构变更。

## 安全与性能
- 安全: 不新增外部数据流，不处理敏感信息。
- 性能: 仅在 @ 菜单构建时按需加载并缓存 tc_header，避免全量预加载。

## 测试与部署
- 手动测试: @ 菜单标题/搜索均使用 tc_header；缺失时为空标题。
- 部署: 常规发布，无数据迁移。
