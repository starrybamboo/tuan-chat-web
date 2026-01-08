# 技术设计: Blocksuite 嵌入场景样式隔离（官方兼容方案）

## 技术方案

### 核心技术
- React + 动态 import（延迟加载 blocksuite 运行时）
- 运行时 CSS 字符串注入（`?inline`）
- pnpm patchedDependencies（对上游包做最小化定点补丁）

### 实现要点
1. **运行时样式作用域化**
   - 新增 `ensureBlocksuiteRuntimeStyles`：
     - `@toeverything/theme/style.css`：将 `:root` 重写为 `:where(.tc-blocksuite-scope, .blocksuite-portal)`，使变量仅在 blocksuite 容器/portal 内生效。
     - `katex/dist/katex.min.css`：将末尾 `body{counter-reset:katexEqnNo mmlEqnNo}` 重写为 `:where(.tc-blocksuite-scope, .blocksuite-portal){counter-reset:...}`，避免全局 body 副作用。
     - 将上述 CSS（以及 `fonts.css`、`affine-embed-synced-doc-header.css`）以 `@layer blocksuite` 注入到 `document.head`。
2. **初始化顺序**
   - 在 Blocksuite 相关页面组件中，先 `startBlocksuiteStyleIsolation()`（用于捕获/回滚可能的全局注入），再 `await ensureBlocksuiteRuntimeStyles()`，最后动态 import blocksuite JS。
3. **主题同步（仅影响 blocksuite 容器/portal）**
   - 将站点主题（`data-theme`/`dark` class）同步到 `.tc-blocksuite-scope`，并为 `.blocksuite-portal` 设置 `data-theme` 与 `dark` class，确保弹层样式一致且不改动 `html/body`。
4. **上游副作用定点补丁**
   - `@blocksuite/affine-inline-link`：将 “disable body scroll” 从 `document.body` 重定向到最近的 `.blocksuite-portal`/`.tc-blocksuite-scope`（ShadowRoot 场景仍优先使用 host）。
   - `@blocksuite/data-view`：将拖拽 cursor 写入从 `document.body` 重定向到最近的 `.blocksuite-portal`/`.tc-blocksuite-scope`（ShadowRoot 场景仍优先使用 host）。
   - 移除 portal 强制 `.shadowDom=true` 的补丁，保持官方默认以规避 Selection/Range 跨树问题。

## 安全与性能
- **安全:** 不引入任何额外外部服务/密钥；pnpm patch 仅对前端包做可审计变更。
- **性能:** CSS 注入仅在 blocksuite 页面首次进入时触发，后续通过 DOM id 去重。

## 测试与验证
- `pnpm install` 验证补丁可应用
- `pnpm typecheck` 验证类型检查通过
- 手工验证建议：空间描述页/个人简介页的输入、拖拽、弹层（slash menu/link popup）与主题切换

