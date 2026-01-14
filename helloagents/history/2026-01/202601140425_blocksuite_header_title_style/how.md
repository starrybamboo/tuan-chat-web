# 技术设计: Blocksuite tcHeader 样式对齐与内置标题移除加固

## 技术方案

### 核心技术
- React（编辑器壳层 UI）
- Blocksuite/AFFiNE 0.22.4（specs + view extensions）
- CSS（作用域：`.tc-blocksuite-scope` + `@layer blocksuite`）

### 实现要点
- **内置标题移除加固**：在 `createEmbeddedAffineEditor.client.ts` 中，为 `disableDocTitle` 的过滤增加“按 extension `name` 识别”的兜底逻辑，避免仅按引用相等导致的漏删。
- **tcHeader 样式对齐**：在 `blocksuiteRuntime.css` 中新增 `tcHeader` 样式，使标题排版对齐 Blocksuite 内置 `doc-title`（参考 `@blocksuite/affine-fragment-doc-title/src/doc-title.ts` 的关键参数）：
  - `font-size: 40px; line-height: 50px; font-weight: 700`
  - `max-width: var(--affine-editor-width); margin: 0 auto`
  - `padding-left/right: var(--affine-editor-side-padding, 24px)`
  - placeholder 颜色使用 `--affine-placeholder-color`，并降低透明度

## 架构决策 ADR

### ADR-001: tcHeader 标题排版以 blocksuite doc-title 为基准
**上下文:** 业务侧需要一套“替代内置标题”的统一头部，但希望视觉上与 Blocksuite 原生标题一致，降低用户认知割裂。
**决策:** `tcHeader` 的标题输入排版/字体/间距以 `@blocksuite/affine-fragment-doc-title` 的 `DocTitle` 样式为基准，并通过 `.tc-blocksuite-scope` 的 CSS 作用域化注入。
**理由:** 不侵入 blocksuite 内部实现，改动点集中、升级成本低；且样式仅影响我们的自定义 header，不影响其它 blocksuite 页面。
**替代方案:** 直接复用 blocksuite 的 `doc-title` 并在其周围再拼接图片/按钮 → 拒绝原因: 需要侵入 spec/widget 渲染与交互，维护成本更高。
**影响:** header 高度会更接近原生标题（更大字号与上下留白），嵌入场景可能需要观察布局是否有溢出/压缩。

## 安全与性能
- **安全:** 不新增外部资源请求；图片仍走既有上传/剪裁流程。
- **性能:** 仅增加少量 CSS 规则与一次性渲染结构调整，不引入额外运行时依赖。

## 测试与部署
- **测试:** 执行 `pnpm typecheck`；并在 `/blocksuite-frame`、空间/房间设置页人工确认标题呈现与 mode 切换不受影响。
- **部署:** 无特殊部署步骤（前端资源构建即可）。
