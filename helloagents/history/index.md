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
