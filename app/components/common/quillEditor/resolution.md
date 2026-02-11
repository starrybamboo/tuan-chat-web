## 背景与目标

当前 `quillEditor.tsx` Լ 3.3k 行，集中了 Quill 初始化、Blot 注册、所见即所得与 Markdown/HTML 互转、Mention 与 Slash 语法、工具栏定位、滚动与选区兜底、粘贴接管、键盘补丁、实体接口耦合等多重职责，维护与调试成本高。目标是按“单一职责 + 清晰边界 + 可观测性”的原则，分解为若干可复用的 hooks/modules/utils/ui 组件，同时在各子域加入可控调试日志，不改动对外 API 行为。

本文档用于列出分步拆分计划与验收标准。在你说“开始”前，仅写计划不改代码；收到“开始”后按步骤逐一实施并验证。

## 目录与分层设计（目标形态）

app/components/common/quillEditor/
- QuillEditor.tsx（瘦包装器，汇总各 hook）
- hooks/
	- useQuillCore.ts（创建/配置 Quill，注册 blot，ready 管理）
	- useSelectionPersistence.ts（选区持久化与激活恢复）
	- useToolbarPosition.ts（折叠小方块/选区横条工具栏的显示与定位）
	- useMentions.tsx（@ 分类→实体两阶段选择、插入/删除、预览）
	- useSlashCommands.ts（/ 命令检测与执行，含对齐等）
	- useMarkdownSync.ts（placeholder Markdown → HTML 初始化；HTML → Markdown 去抖回传）
	- usePasteHandlers.ts（HTML 片段/Markdown 粘贴接管与覆盖插入）
	- useBackspaceGuards.ts（空块格式退化、紧前 mention/embed 删除、@ 起点删除退出）
- modules/
	- quillLoader.ts（lazy 载入 + requestIdleCallback 预热）
	- quillBlots.ts（mention-span 与 hr blot 注册，幂等）
- utils/
	- logger.ts（按域调试日志：Quill/Core、Toolbar、Mentions、Slash、Paste、Markdown、Backspace、DOM 等）
	- dom.ts（computeNativeCaretPos、滚动与 rAF 工具）
	- timers.ts（去抖/节流/rAF 序列）
	- deltaHtml.ts（若后续需要）
- ui/
	- InlineToolbar.tsx、SelectionToolbar.tsx（若需要从现有 ./toolbar 再细分）
	- MentionPreview.tsx（复用现有）
- types.ts（跨 hook 共享类型）

说明：现有工具与组件（htmlToMarkdown、markdownToHtml、restoreRawHtml、htmlTagWysiwyg、wysiwygFuc、MentionPreview、toolbar）继续复用，仅在必要时细分。

## 步骤清单（执行顺序）

1) 设计与调试开关落地（仅新增文件，不改现有逻辑）
	 - 新增 utils/logger.ts：
		 - createLogger(scope): { debug, info, warn, time, timeEnd }
		 - 开关来源：
			 - 细粒度环境变量：NEXT_PUBLIC_DEBUG_QUILL=1 开启全部；NEXT_PUBLIC_DEBUG_QUILL_DOM/MENTION/SLASH/PASTE/MARKDOWN/BACKSPACE/TOOLBAR 分域开关
			 - 组件级：debugSelection=true 时至少开启 Selection/Persistence/Toolbar 相关日志
		 - 统一输出格式："[Quill/<SCOPE>] message", 附结构化上下文（index/length/pos/diff/time）
	 - 新增 utils/timers.ts 与 utils/dom.ts（rAF 包装、computeNativeCaretPos 等），仅复制现有内联逻辑，不改变行为。

2) 基础模块抽离（不改变对外行为）
	 - modules/quillLoader.ts：抽离 quill 的预加载与 requestIdleCallback 预热，保留防重复 promise。
	 - modules/quillBlots.ts：集中注册 mention-span 与 hr，保证幂等并输出日志。
	 - 验收：现有编辑器可正常渲染、blot 生效、日志可控，功能零差异。

3) useQuillCore.ts（创建实例与模块配置）
	 - 负责：
		 - 通过 quillLoader.ts 加载并创建实例
		 - 注册 blot（quillBlots.ts）
		 - 配置 modules：toolbar: false、clipboard、history 等
		 - 处理初始 placeholder Markdown → HTML 的“仅一次”导入（或留给 useMarkdownSync，二者择一）
		 - 对外返回：{ editorRef, ready }
	 - 调试：初始化耗时、注册结果、history/clipboard 状态。

4) useSelectionPersistence.ts（选区持久化与激活恢复）
	 - 负责：localStorage 读写选区；active/focusOnActive 触发一次 focus + ensureVisible。
	 - 调试：存取的选区值、命中/未命中、滚动修正与失败原因。

5) useToolbarPosition.ts（悬浮工具栏）
	 - 负责：
		 - 折叠态小方块与非折叠态横条工具栏的可见性与位置
		 - rAF 双帧稳定、scrollTop 溢出修正、原生 Selection 兜底
		 - 导出：tbVisible/tbTop/tbLeft、selTbVisible/selTbTop/selTbLeft、scheduleUpdate、activeFormats
	 - 调试：定位来源（同步/RAF/原生兜底）、坐标、跳过/锁定原因。

6) useMentions.tsx（@ 两阶段 + 预览）
	 - 负责：
		 - delta 中 @ 的检测与激活；分类→实体两阶段筛选；键盘导航；插入 mention-span；紧前 embed 删除；@ 删除退出
		 - 悬停预览：mouseenter/mouseout/滚动关闭
	 - 调试：激活/退出原因、筛选量、插入耗时、失败回退（纯文本 @label）。

7) useSlashCommands.ts（/ 命令）
	 - 负责：
		 - 行首或“非字母数字分隔后”的 / 检测、位置与高亮
		 - 命令执行（与 detectAlignment 等保持现有行为）
	 - 调试：触发/退出语义、解析的 segment、执行结果。

8) useMarkdownSync.ts（Markdown/HTML 同步）
	 - 负责：
		 - placeholder Markdown → HTML 初始导入（与 useQuillCore 拆分或合并，视实现择优）
		 - text-change 去抖收敛：HTML（restoreRawHtml 之后）→ Markdown，避免重复回传
	 - 调试：每次序列化触发来源/耗时、变更摘要（长度/hash）。

9) usePasteHandlers.ts（粘贴接管）
	 - 负责：
		 - a/img 简片段白名单 HTML 插入与上限控制；纯文本/Markdown 的插入策略；覆盖选区粘贴
	 - 调试：clipboard 类型（text/html/plain）、分支选择、节点数与耗时。

10) useBackspaceGuards.ts（回退补丁）
	 - 负责：
		 - 空标题/空列表退化为段落
		 - 紧前 mention/embed 删除并触发 onDeleteSpecialKey
		 - @ 起点删除时退出 mention ״̬
	 - 调试：触发与否、匹配到的类型与实体。

11) QuillEditor.tsx（瘦包装器）
	 - 负责：
		 - 组合以上 hooks，管理引用与顺序
		 - 渲染现有 UI（InlineMenu、SelectionMenu、MentionPreview），必要时将 ./toolbar 再细分为 ui/InlineToolbar.tsx 与 ui/SelectionToolbar.tsx
	 - 输出：保持原 props 契约不变。

## 调试与可观测性设计

- ͳһ logger：`[Quill/<SCOPE>]` ǰ׺ + 结构化上下文（index、length、pos、scrollTop 修正、bounds、耗时等）。
- 开关：
	- 全局：NEXT_PUBLIC_DEBUG_QUILL=1 开启所有域
	- 分域：NEXT_PUBLIC_DEBUG_QUILL_DOM/MENTION/SLASH/PASTE/MARKDOWN/BACKSPACE/TOOLBAR
	- 组件：debugSelection=true 优先启用 Selection/Toolbar/Persistence 域
- 时序重点：初始化、事件绑定/解绑、定位与滚动修正、mention/slash 激活/退出、粘贴分支选择、markdown 序列化去抖触发、回退退化判定。

## 接口契约与兼容性

- 对外 props 保持不变：
	- id, placeholder, onchange, onSpecialKey, onDeleteSpecialKey, persistSelectionKey, active, focusOnActive, debugSelection
- 行为等价：
	- mention 与 slash 触发条件、插入/退出逻辑、对齐/代码块/标题/列表、粘贴策略、Backspace 退化等均保持现状
- 内部仅重构结构与可观测性，不改变业务规则。

## 验收标准（每一步）

- 构建：TypeScript 通过（PASS）
- 运行：编辑器可正常输入、选择、工具栏显示与定位正常（PASS）
- 语法：mention/slash/markdown/paste/backspace 行为与主干一致（PASS）
- 日志：在开启调试后，能看到对应域的关键日志（PASS）
- 组件瘦身：最终 `QuillEditor.tsx` < 300 行（目标），逻辑分散至 hooks/modules/utils（PASS）

## 风险与回滚

- 风险：事件时序变化导致定位/滚动闪烁；去抖导致回传延迟；分域解耦造成引用顺序问题。
- 缓解：保持原始调用顺序，先抽离“纯工具与模块”，再迁出 hooks，分步提交验证；每步都保留功能等价的快照。
- 回滚：任一步出现不可控问题，可回退到上一步标签（逐步提交）。

## 预计节奏

- Step 1-2：新增 logger/dom/timers 与 quillLoader/quillBlots（0.5-1 天）
- Step 3-5：useQuillCore / useSelectionPersistence / useToolbarPosition（0.5-1 天）
- Step 6-10：Mentions/Slash/MarkdownSync/Paste/Backspace（1-1.5 天）
- Step 11：薄封装与回归（0.5 天）

## 启动条件

回复“开始”后，按本文档步骤从第 1 步依次实施。实施期间会：
- 每完成 3-5 个文件创建/修改，做一次进度小结；
- 每一步结束运行构建与快速自测，确保“绿”后再继续；
- 实施过程中如发现可无损优化，将补充到本文档“后续事项”。

