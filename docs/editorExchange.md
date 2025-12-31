# Blocksuite 富文本替换方案

以下步骤用于将现有的 QuillEditor 逐步替换为基于 Blocksuite 的富文本编辑器。在整个过程里，保持代码结构可扩展，并为未来引入画板模式与协同能力预留空间。

## 阶段一：基础 Blocksuite 编辑器搭建

1. **创建基础组件**：在 `app/components/common/blocksuiteEditor` 目录下实现 `BaseEditor`，封装 Blocksuite 必需的 Store、Editor 实例以及 React 适配层。
2. **WYSIWYG 能力**：引入 Blocksuite 提供的富文本块（paragraph/list/code 等），配置默认工具栏，确保输入输出可视化一致。
3. **Markdown 兼容启动**：启用 Blocksuite 的 Markdown 支持模块，验证常见语法（标题、列表、粗斜体、代码块）在编辑器内正常渲染。
4. **可扩展结构**：抽象渲染层与状态管理层，预留 Hook/Provider，后续可追加画板或协同模块而无需重写组件。

## 阶段二：内容转换与接口接入

1. **内容转换函数**：基于 Blocksuite 的导入导出 API，实现 Markdown ↔ 双向转换方法，同时保留 HTML 导出能力。
2. **兼容现有接口**：在 `BaseEditor` 外层暴露 `onChange`、`setContent`、`getContent` 等方法，与当前 QuillEditor 对接的接口保持一致。
3. **后端同步**：在调用现有保存 / 加载接口时，按需选择 Markdown 或 HTML 作为存储格式，确保旧数据可逐步迁移。
4. **回退策略**：为异常情况预留 fallback，将 Blocksuite 内容降级为纯文本，避免因转换失败导致数据丢失。

## 阶段三：自定义语法与业务扩展

1. **Mention / Slash 扩展**：利用 Blocksuite 的自定义块或 inline mark 能力，重新实现 @ 实体、Slash 命令等业务场景，并与当前接口联通。
2. **工具栏与快捷键**：补齐 QuillEditor 中的快捷操作（对齐、代码块、格式清除等），借助 Blocksuite 扩展点实现相同交互。
3. **语法存储与解析**：当自定义语法需要特殊持久化时，设计专属数据结构，并在 Markdown/HTML 导出时做相应序列化/反序列化。
4. **未来拓展准备**：在设计自定义语法模块时，预留协同标识与画板挂载点，便于后续引入协作与多模态场景，减少重构成本。

## 验收与迁移流程

1. **自动化测试**：补充内容转换、语法解析、接口调用的单元测试与端到端测试，保证替换过程稳定。
2. **持续迭代**：根据协同及画板需求，按计划迭代后续模块，复用阶段一搭建的可扩展架构。

