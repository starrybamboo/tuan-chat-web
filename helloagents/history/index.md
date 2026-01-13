# 变更历史索引

本文件记录所有已完成变更的索引，便于追溯和查询。

---

## 索引

| 时间戳 | 功能名称 | 类型 | 状态 | 方案包路径 |
|--------|----------|------|------|------------|

| 202601070338 | blocksuite_docs | 功能 | 已完成 | [2026-01/202601070338_blocksuite_docs/](2026-01/202601070338_blocksuite_docs/) |
| 202601070431 | blocksuite_docs_0_22_4 | 文档 | 已跳过 | [2026-01/202601070431_blocksuite_docs_0_22_4/](2026-01/202601070431_blocksuite_docs_0_22_4/) |
| 202601070539 | blocksuite_docs_0224 | 文档 | 已跳过 | [2026-01/202601070539_blocksuite_docs_0224/](2026-01/202601070539_blocksuite_docs_0224/) |
| 202601081220 | blocksuite_css_regression | 修复 | 已完成 | [2026-01/202601081220_blocksuite_css_regression/](2026-01/202601081220_blocksuite_css_regression/) |
| 202601082056 | blocksuite_strict_style_isolation | 修复 | 已完成（已废弃） | [2026-01/202601082056_blocksuite_strict_style_isolation/](2026-01/202601082056_blocksuite_strict_style_isolation/) |
| 202601082212 | blocksuite_style_isolation_official | 修复 | 已完成 | [2026-01/202601082212_blocksuite_style_isolation_official/](2026-01/202601082212_blocksuite_style_isolation_official/) |
| 202601082245 | blocksuite_iframe_isolation | 修复 | 已完成 | [2026-01/202601082245_blocksuite_iframe_isolation/](2026-01/202601082245_blocksuite_iframe_isolation/) |
| 202601110311 | blocksuite_ssr_doc_metas | 修复 | 已完成 | [2026-01/202601110311_blocksuite_ssr_doc_metas/](2026-01/202601110311_blocksuite_ssr_doc_metas/) |
| 202601110741 | blocksuite_ssr_safe_imports | 修复 | 已完成 | [2026-01/202601110741_blocksuite_ssr_safe_imports/](2026-01/202601110741_blocksuite_ssr_safe_imports/) |
| 202601111227 | webgal_realtime_create_game_no_template | 修复 | 已完成 | [2026-01/202601111227_webgal_realtime_create_game_no_template/](2026-01/202601111227_webgal_realtime_create_game_no_template/) |
| 202601111240 | webgal_settings_terre_port_indexeddb | 功能 | 已完成 | [2026-01/202601111240_webgal_settings_terre_port_indexeddb/](2026-01/202601111240_webgal_settings_terre_port_indexeddb/) |
| 202601131356 | ai_image | 功能 | 已完成 | [2026-01/202601131356_ai_image/](2026-01/202601131356_ai_image/) |
| 202601131515 | sidebar_tree_restore | 修复 | 已完成 | [2026-01/202601131515_sidebar_tree_restore/](2026-01/202601131515_sidebar_tree_restore/) |
| 202601131558 | create_tabs | 优化 | 已完成 | [2026-01/202601131558_create_tabs/](2026-01/202601131558_create_tabs/) |

---

## 按月归档

### 2026-01

- [202601070338_blocksuite_docs](2026-01/202601070338_blocksuite_docs/) - Blocksuite 依赖文档补全（0.22.4）
- [202601070431_blocksuite_docs_0_22_4](2026-01/202601070431_blocksuite_docs_0_22_4/) - Blocksuite 0.22.4 文档方案（未执行归档：已由 blocksuite_docs 覆盖）
- [202601070539_blocksuite_docs_0224](2026-01/202601070539_blocksuite_docs_0224/) - Blocksuite 0.22.4 文档方案（未执行归档：已由 blocksuite_docs 覆盖）
- [202601081220_blocksuite_css_regression](2026-01/202601081220_blocksuite_css_regression/) - BlockSuite CSS 回归修复（按需加载 + KaTeX 全局副作用隔离）
- [202601082056_blocksuite_strict_style_isolation](2026-01/202601082056_blocksuite_strict_style_isolation/) - BlockSuite 嵌入场景样式强隔离（已废弃：Shadow DOM 引发 Selection/Range 兼容性问题）
- [202601082212_blocksuite_style_isolation_official](2026-01/202601082212_blocksuite_style_isolation_official/) - BlockSuite 嵌入场景样式隔离（官方兼容：作用域样式注入 + 上游副作用补丁）
- [202601082245_blocksuite_iframe_isolation](2026-01/202601082245_blocksuite_iframe_isolation/) - BlockSuite 嵌入场景 iframe 强隔离（最稳）
- [202601110311_blocksuite_ssr_doc_metas](2026-01/202601110311_blocksuite_ssr_doc_metas/) - 修复 SSR 评估阶段静态引入 Blocksuite workspace 依赖链触发 `document is not defined`
- [202601110741_blocksuite_ssr_safe_imports](2026-01/202601110741_blocksuite_ssr_safe_imports/) - 修复 SSR 评估阶段静态引入 blocksuite runtime（deleteSpaceDoc 动态 import）
- [202601111227_webgal_realtime_create_game_no_template](2026-01/202601111227_webgal_realtime_create_game_no_template/) - WebGAL 实时渲染创建游戏不使用模板，创建失败直接返回失败
- [202601111240_webgal_settings_terre_port_indexeddb](2026-01/202601111240_webgal_settings_terre_port_indexeddb/) - WebGAL 实时预览支持配置 Terre 端口，设置改为 IndexedDB 持久化
- [202601131356_ai_image](2026-01/202601131356_ai_image/) - 新增 AI 生图测试页（Electron 代理 NovelAI）
- [202601131515_sidebar_tree_restore](2026-01/202601131515_sidebar_tree_restore/) - Chat sidebarTree 分类/重置/创建与文档路由对齐
- [202601131558_create_tabs](2026-01/202601131558_create_tabs/) - 分类“+”创建入口改为标签页式单弹窗
