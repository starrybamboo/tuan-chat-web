# Quill 数据流与交互时序（quillEditor.tsx 实战笔记）

本文梳理在 quillEditor.tsx 中一次输入从键盘到界面变化、再到序列化上行的完整链路，重点回答三个问题：
- 普通输入时，数据如何在组件内流动并触发渲染
- 输入空格时，text-change 为何触发、如何执行“块/行内规则”并更新 UI
- 输入 @ 时，如何修改 Delta、维护 mention 状态并最终插入自定义 blot

---

## 0) 角色与术语速览

- Quill 编辑器
  - 负责拦截 DOM 输入事件（键盘、IME、剪贴板等），将其转成 Delta 并更新内部文档。
  - 每次文档变更后触发 text-change(delta, oldDelta, source) 与 selection-change。
- Delta（操作序列）
  - 常见 op 类型：
    - { insert: "x" } 插入文本或 { insert: { image: url } } 插入 embed
    - { retain: n } 跳过 n 个字符
    - { delete: n } 删除 n 个字符
  - source ∈ {'user','api','silent'}，表示变更来源。
- React 覆层 UI
  - 悬浮工具条、小按钮、mention/命令弹窗等由 React 渲染；编辑区文本变更由 Quill 自行渲染。
- 组件内状态（示例）
  - selection 光标信息；tbVisible/tbTop/tbLeft 工具栏位置可见性
  - mentionActive/mentionStart/mentionQuery/mentionPos
  - slashActive/slashStart/slashQuery 等

---

## 1) 一次“普通输入”的数据流

1. DOM → Quill
   - 用户在编辑区输入“a”，Quill 把该输入转为 delta:
     - 例：{ ops: [{ retain: 10 }, { insert: "a" }] }
   - Quill 更新内部文档并触发 text-change(delta, oldDelta, 'user')。

2. quillEditor.tsx 捕获 text-change
   - 读取 delta.ops，累加本次 insert 文本 inserted。
   - 记录最新 selection（getSelection），缓存到本地状态/引用，便于后续定位。

3. 规则处理与状态更新（视 inserted 与上下文而定）
   - 空格触发块/行内规则（见第 2 节）
   - @ 触发 mention 状态机（见第 3 节）
   - 其它：HTML 片段转标签、对齐指令、行内 Markdown 等

4. 定位与渲染 UI
   - 计算当前光标或选区的 bounds（editor.getBounds），推导出工具栏/弹窗的 top/left。
   - setState 更新可见性与位置；React 重新渲染“覆层 UI”。（编辑区文本由 Quill 已经渲染好）

5. 序列化与上行同步（rAF/微任务节流）
   - scheduleSerialize：读取 editor.root.innerHTML → restoreRawHtml → htmlToMarkdown
   - 若 Markdown 变化，调用 props.onchange(md) 将内容同步给父层/后端。
   - 对齐协议采用 /center /right /between，方便后端解析。

ASCII 时序（简化）：
```
键盘/IME → Quill(生成+应用Delta) → text-change → 组件处理规则/更新状态 → React覆层重渲染
                                               ↘ rAF 序列化 HTML→MD → props.onchange
```

---

## 2) 输入“空格”时：为何触发 text-change，以及如何执行规则与渲染

1. Delta 触发
   - 输入空格 Quill 一样会产出 delta（insert: ' ' 或非断行空格），因此必然触发 text-change。

2. endsWithSpace 判定
   - 组件汇总 inserted 后用正则检查是否以空白字符结尾：
     - 例：/[\u0020\u00A0\u2007\u3000]$/.test(inserted)
   - 若不是以空格结尾，直接跳过块/行内规则处理（避免每个字符都走重逻辑）。

3. 回溯该行文本与触发规则
   - 从当前光标向左回溯到上一换行，获得本行左侧文本 lineLeft。
   - 优先尝试“HTML 片段 → 标签”转换；成功则刷新一次位置后返回。
   - 依次尝试：
     - 块级 Markdown（# → 标题、1. → 有序列表、- → 无序列表等）
     - 对齐指令（/center | /right | /between 在段末 + 空格触发）
     - 行内 Markdown（**bold**、__underline__、~~strike~~ 等）
   - 对于块/对齐规则，通常会“吃掉”触发用空格：editor.deleteText(sel.index - 1, 1, 'user')，以免多出空白。

4. 位置与 UI 刷新
   - 触发规则可能改变行格式或结构，调用 editor.getBounds 重新计算小工具条/横条位置。
   - setState 更新 tbVisible/selTbVisible 及其坐标，React 仅重渲染覆层。

要点：
- text-change 来自 Quill 应用 delta 后的回调；UI 覆层渲染来自 React setState。
- 块/行内规则仅在“以空格结尾”时触发，可避免打字中间频繁误判。

---

## 3) 输入“@”时：如何修改 Delta 与维护 mention

目标：在用户输入 “@” 后，出现候选弹窗；用户选择候选后，将 “@xxx” 替换为自定义 mention blot，并在末尾补空格。

A. 识别“新插入的 @”
- 在本次 text-change 的 delta.ops 中收集 inserted，并定位最后一个 “@” 的相对位置 lastAtRelative。
- 由当前 selection 与 lastAtRelative 计算全局索引 globalIdx 并校验该处确为 “@”（兼容 IME 合并/换行偏移）。

B. 激活 mention 模式
- 记录起点：mentionStart = globalIdx，mentionQuery = ""。
- 计算弹窗位置：const b = editor.getBounds(globalIdx, 0)；根据编辑器容器 rect 得出 top/left，setMentionPos。
- setMentionActive(true)，弹出候选面板（初始“分类/列表”阶段）。

C. 已激活时的“实时更新”
- 每次 text-change 或 selection-change：
  - 若光标回到 @ 之前，或 @ 到光标之间出现换行 → 关闭 mention 模式。
  - 否则，取当前 slice = editor.getText(mentionStart, sel.index - mentionStart)，更新 mentionQuery = slice.slice(1)。
  - 重新计算弹窗位置（使用光标 bounds）。

D. 识别“@ 被删除”的情况
- 当 delta 含 delete 时，维护一份游标，若 delete 覆盖了 mentionStart → 视为 @ 已被删除 → 关闭 mention 模式。

E. 插入自定义 blot（候选被选中时）
- 删除原文本：editor.deleteText(mentionStart, sel.index - mentionStart, 'user')
- 插入 embed：
  - editor.insertEmbed(mentionStart, 'mention-span', { label, category })
  - 若 blot 未注册/失败，则降级为纯文本“@label”
- 尾随空格：editor.insertText(mentionStart + 1, ' ', 'user')
- 调整光标：editor.setSelection(mentionStart + 2, 0, 'user')
- 清理状态：关闭弹窗、重置 query 与高亮

F. 删除 embed 的兜底
- 捕获 Backspace：
  - 若光标前一个 leaf 是 .ql-mention-span，直接 editor.deleteText(prevIndex, 1, 'user') 并阻止默认行为。

Delta 样例（简化）：
```json
// 输入 @a
{ "ops": [ { "retain": 12 }, { "insert": "@a" } ] }

// 选择候选“@Alice”
[
  { "retain": 12 },            // 游标前的文本
  { "delete": 2 },             // 删除 "@a"
  { "insert": { "mention-span": { "label": "Alice", "category": "user" } } },
  { "insert": " " }            // 末尾空格
]
```

---

## 4) 工具栏/弹窗定位：为何“跟着光标走”

- 折叠选区：editor.getBounds(sel.index, 0)
- 有选区：editor.getBounds(sel.index, sel.length)
- 计算：
  - bounds 相对 root 的坐标，叠加容器滚动/偏移，得出屏幕坐标。
  - 结合覆层尺寸做防溢出处理（靠近右/下边缘时反向偏移）。
- 兜底：
  - 某些场景（自定义字体/缩放）getBounds 不准确，可退回原生 selection.getRangeAt(0).getBoundingClientRect 作为参考。
- 刷新时机：
  - 聚焦/输入/选择变更/滚动/窗口尺寸变化都触发 scheduleToolbarUpdate（rAF 节流）。

---

## 5) 序列化与上行协议（HTML → Markdown）

- 在 text-change 后的下一帧：
  - 读取 editor.root.innerHTML
  - restoreRawHtml 还原必要的原始标记（避免 Quill 输出差异）
  - htmlToMarkdown 统一序列化规则：
    - 代码块围栏合并、空块六反引号
    - 空行编码为字面“\\n”
    - 缩进解析：tab/4 空格、ql-indent-N、style(text-indent/padding-left/margin-left)
    - 段落对齐末尾指令：/center /right /between（取代 crb）
    - mention/a/img 的安全保留
  - 内容变化时调用 props.onchange(md) 通知父组件/后端。

---

## 6) 常见 Delta 片段参考

- 普通字符
```json
{ "ops": [ { "retain": 5 }, { "insert": "x" } ] }
```
- 空格
```json
{ "ops": [ { "retain": 5 }, { "insert": " " } ] }
```
- 回车（换行）
```json
{ "ops": [ { "retain": 5 }, { "insert": "\n" } ] }
```
- 删除 3 个字符
```json
{ "ops": [ { "retain": 5 }, { "delete": 3 } ] }
```
- 插入 mention blot（示意）
```json
{ "ops": [ { "retain": 5 }, { "insert": { "mention-span": { "label": "Alice", "category": "user" } } } ] }
```

---

## 7) 排错与调试建议

- 观察 text-change 事件三参：
  - delta.ops：本次“做了什么”
  - oldDelta：变更前文档（可选）
  - source：'user' | 'api' | 'silent'
- 关键断点/日志位：
  - “以空格结尾”分支的入口与返回
  - “首次插入 @ 激活”与“已激活更新”两条路径
  - “@ 被删除/跨行”导致的关闭路径
  - insertEmbed 前后的 selection 和 bounds
- 位置异常：
  - 对比 editor.getBounds 与原生 selection rect 的差距，用原生 rect 兜底。
- 严格模式/并发：
  - 副作用只放在 commit 后（useEffect/useLayoutEffect）；渲染阶段保持纯函数，避免多次重放带来的异常。

---

## 8) 速查清单（Checklist）

- text-change 触发 = Quill 应用 Delta 后；React 覆层只受 setState 影响。
- 空格 → endsWithSpace → 行回溯 → HTML/Markdown/对齐/行内 规则链；块/对齐通常会“吃掉空格”。
- @ 输入：
  - 首次激活：定位全局 “@” 索引 → mentionStart/mentionQuery → 计算弹窗位置
  - 已激活：slice 到光标 → 更新 query 与位置；跨行/回退/删除时关闭
  - 选择候选：deleteText + insertEmbed + 追加空格 + setSelection
- 工具栏/弹窗“跟着光标走”：getBounds + 容器偏移 + 防溢出
- 序列化上行：restoreRawHtml → htmlToMarkdown，指令采用 /center /right /between
