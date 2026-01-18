# 技术设计: @ 提及菜单标题使用 tc_header

## 技术方案

### 核心技术

- Blocksuite Workspace/Store/Yjs
- `workspace.meta` 作为 `@`（Linked Doc）菜单标题数据源

### 实现要点

1. 在 `spaceWorkspace.ts` 的标题派生逻辑中：
   - 增加从 `store.spaceDoc` 读取 `tc_header.title` 的能力
   - `tryDeriveDocTitle(...)` 优先返回 `tc_header.title`，否则回退到原生 page title
2. 在 meta 同步点位中（doc 打开/标题水合）：
   - 将 meta.title 与上述“派生标题”对齐（不再仅在 meta 为空时填充）
3.（可选）在 `tc_header.title` 变更时同步更新 meta.title，确保实时一致

## 安全与性能

- **安全:** 只读取 `tc_header`，不写入文档内容；meta 更新为纯前端内存/本地状态
- **性能:** 仅对需要的 doc 顺序水合；对 meta 更新做差异判断

## 测试与部署

- **测试:** 本地运行 `dev` 后手动验证：输入 `@` 时列表标题与 `tc_header` 一致
- **部署:** 无额外步骤

