# Quill 引用统计（tuan-chat-web）

日期: 2026-01-14  
范围: `tuan-chat-web/`  
目的: 统计 Quill/QuillEditor 相关引用位置，为后续“去 Quill 化”提供改造清单与拆解依据。

---

## 1. 快速结论

- 当前存在两类依赖：
  - **编辑能力（QuillEditor）**：少量业务页面仍直接使用 `QuillEditor` 作为富文本编辑入口。
  - **渲染能力（MarkdownMentionViewer）**：多处业务页面使用 `MarkdownMentionViewer` 渲染 markdown/mention（不一定需要 Quill，但当前实现与 Quill 工具链强耦合）。
- Quill 的实现集中在：`app/components/common/quillEditor/`（包含 loader/blots/toolbar/css/markdown/html 转换等）。
- 构建侧存在显式兼容项：`vite.config.ts` 中的 `quill-delta` 预打包/兼容配置；依赖侧存在 `package.json` 的 `quill` 依赖。

---

## 2. 业务侧引用（直接消费）

### 2.1 QuillEditor（编辑）

**直接使用 `<QuillEditor />` 的业务文件（含行号）：**
- `app/components/chat/message/items/displayOfItemsDetail.tsx:10`（import）
- `app/components/chat/message/items/displayOfItemsDetail.tsx:402`（render）
- `app/components/chat/message/items/displayOfItemsDetail.tsx:428`（render）
- `app/components/module/workPlace/components/LocationEdit.tsx:9`（import）
- `app/components/module/workPlace/components/LocationEdit.tsx:252`（render）

**实现本体：**
- `app/components/common/quillEditor/quillEditor.tsx:168`（export default）

### 2.2 MarkdownMentionViewer（展示）

**直接使用 `<MarkdownMentionViewer />` 的业务文件（含行号）：**
- `app/components/chat/message/clue/clueMessage.tsx:4`（import）
- `app/components/chat/message/clue/clueMessage.tsx:69`（render）
- `app/components/chat/message/items/displayOfItemsDetail.tsx:9`（import）
- `app/components/chat/message/items/displayOfItemsDetail.tsx:386`（render）
- `app/components/chat/message/items/displayOfItemsDetail.tsx:412`（render）
- `app/components/chat/message/items/displayOfItemsDetail.tsx:438`（render）
- `app/components/chat/message/location/displayOfLocationDetail.tsx:6`（import）
- `app/components/chat/message/location/displayOfLocationDetail.tsx:348`（render）
- `app/components/chat/message/location/displayOfLocationDetail.tsx:374`（render）
- `app/components/module/detail/moduleDetail.tsx:11`（import）
- `app/components/module/detail/moduleDetail.tsx:499`（render）
- `app/components/module/detail/ContentTab/scene/ItemDetail.tsx:2`（import）
- `app/components/module/detail/ContentTab/scene/ItemDetail.tsx:99`（render）
- `app/components/module/detail/ContentTab/scene/ItemDetail.tsx:108`（render）
- `app/components/module/detail/ContentTab/scene/ItemDetail.tsx:191`（render）
- `app/components/module/detail/ContentTab/scene/ItemDetail.tsx:199`（render）
- `app/components/module/detail/ContentTab/EntityDetail.tsx:2`（import）
- `app/components/module/detail/ContentTab/EntityDetail.tsx:98`（render）
- `app/components/module/detail/ContentTab/EntityDetail.tsx:108`（render）

**实现本体：**
- `app/components/common/quillEditor/MarkdownMentionViewer.tsx:23`（export default）

---

## 3. Quill 实现模块（内部目录）

目录: `app/components/common/quillEditor/`

文件清单（实现/工具/文档混合）：
- `htmlTagWysiwyg.ts`
- `htmlToMarkdown.ts`
- `MarkdownMentionViewer.tsx`
- `markdownToHtml.ts`
- `MentionPreview.tsx`
- `quill-overrides.css`
- `quillDataStream.md`
- `quillEditor.tsx`
- `resolution.md`
- `restoreRawHtml.ts`
- `toolbar.tsx`
- `wysiwygFuc.ts`
- `modules/quillBlots.ts`
- `modules/quillLoader.ts`
- `utils/debug.md`
- `utils/dom.ts`
- `utils/logger.ts`
- `utils/timers.ts`

---

## 4. 构建与依赖侧引用

### 4.1 依赖

- `package.json`
  - `quill`: `^2.0.3`（`package.json:93`）

### 4.2 构建配置

- `vite.config.ts`
  - `quill-delta`（`vite.config.ts:38` / `vite.config.ts:377` / `vite.config.ts:441`）

---

## 5. 后续处理建议（用于拆解任务）

### 5.1 分两步拆除（建议）

1) **先去编辑（QuillEditor）**
   - 优先把线索/物品/Location 等编辑入口改为目标方案（如 BlockSuite 或 MarkdownEditor）。
   - 这一阶段可以暂时保留 `MarkdownMentionViewer`，避免一次性影响展示链路。

2) **再解耦展示（MarkdownMentionViewer）**
   - 评估是否可替换为 `MarkDownViewer`（或统一 markdown 渲染组件），并保留 @mention 的校验/hover 预览能力（当前在 `MarkdownMentionViewer`/`MentionPreview` 内实现）。

### 5.2 推荐的排查命令（维护用）

- 业务侧编辑入口：搜索 `QuillEditor`
- 业务侧展示入口：搜索 `MarkdownMentionViewer`
- 构建/依赖：搜索 `quill` / `quill-delta`
