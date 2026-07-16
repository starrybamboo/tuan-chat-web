# MessageEditor 端到端测试指南

## 当前边界

- 仓库当前没有正式的 Playwright 或 Cypress 配置。
- `MessageEditor` 已有 policy、transaction、selection、persistence 和 virtualization 的 Vitest 覆盖，但单元测试不能证明真实 DOM 焦点、网络保存和刷新回读正确。
- 写入型 E2E 只能运行在专用测试账号和可重置房间。不要把真实用户房间当 fixture，也不要只依赖测试结束时的反向编辑来清理数据。
- 房间文档不是 CRDT/OT。并发修改同一个 block 的冲突语义需要先明确；在此之前，E2E 至少覆盖不同 block 的并发修改不丢失，以及同 block 冲突有明确提示或确定的 last-write-wins 行为。

## 三层验证

### 1. 纯逻辑与组件测试

```bash
corepack pnpm --filter @tuanchat/web exec vitest run \
  --config vitest.config.ts app/components/messageEditor
```

这层负责快速验证：

- transaction 规划、引用稳定和 undo/redo history；
- block split/merge、跨块替换、粘贴、拖拽排序和媒体 payload；
- persistence plan、保存中的再次编辑、optimistic update、失败 rollback 和服务端字段对账；
- selection、visible hit-test、pointer lifecycle、Virtuoso adapter 和滚动锚点 policy。

### 2. 已登录真实页面 smoke

在真实大房间中只执行不写入数据的检查：

1. 首次点击长文本中部，确认 `window.getSelection()` 为 collapsed，且 offset 不为 `0`。
2. 长按或拖拽形成跨块选区，确认起点、终点和选中文字一致。
3. 向下滚动，确认 Virtuoso 只挂载连续视口窗口；滚回后 mounted 数回落、内容不丢且位置不跳变。
4. 标题完全滚出编辑器视口后，确认紧凑标题和保存状态出现；回到顶部后隐藏。
5. 分别在默认桌面宽度和 `375 x 840` 下检查遮挡、横向溢出和标题截断。

真实用户房间不得执行输入、删除、拖拽、上传或保存测试。

### 3. 正式 Playwright 集成测试

建议新增：

```text
apps/web/playwright.config.ts
apps/web/e2e/message-editor.spec.ts
apps/web/e2e/message-editor-sync.spec.ts
apps/web/e2e/fixtures/messageEditorRoom.ts
```

运行前必须具备：

- 独立测试账号及其 `storageState`，文件不提交仓库；
- 独立空间和房间；
- suite 前后都能把房间恢复到同一份确定 seed 的 fixture API 或测试数据库任务；
- fixture 至少包含 3 个短文本块、2 个长文本块、图片/音频/文件 block，以及 500 和 4000 block 两种规模；
- React Scan 关闭，避免交互与性能断言被开发调试工具污染。

## P0 场景和断言

| 场景 | 用户操作 | 必须断言 |
| --- | --- | --- |
| 首次点击光标 | 点击长文本中部 | active block 正确；collapsed selection；offset 与点击位置一致且不为 0 |
| 连续输入 | 输入唯一 marker | DOM 仅目标 block 改变；光标连续；一次 undo 撤销本次 typing group；redo 恢复 |
| Enter / Backspace | 中间拆块，再在边界合并 | block 内容、顺序、speaker metadata 和焦点位置正确 |
| 跨块选择 | 从 block A 拖到 block C，替换文字 | 选区文本准确；替换后 A/C 边界内容正确；中间 block 按规则删除 |
| 拖拽排序 | 将一个 block 移到另一个 block 前后 | DOM 顺序、patch `move` 操作和刷新后顺序一致 |
| 虚拟化 | 滚动 4000-block fixture 并返回 | mounted real blocks 保持有界；内容不丢；滚动跳变在验收阈值内 |
| 稳定 key | 编辑并等待保存回流 | 未改动块的 `data-me-block-id` 在 patch response 和消息流回流后保持不变 |
| 离屏恢复 | 在顶部输入并 undo，滚到深处后 redo | 自动滚到目标 index；目标块挂载后恢复光标；再次 undo 可清理 |
| IME | 中文输入过程中持续向远处滚动 | composing block 不卸载；compositionend 后窗口可以正常回收 |
| 保存与回读 | 修改后等待保存，再刷新 | 见下方“三重保存证据” |
| 保存中继续输入 | 第一轮 patch 发出后继续输入 | 第一轮完成不能覆盖后续输入；第二轮 patch 最终保存最新内容 |
| 保存失败 | 将一次 patch mock 为 500 | UI 显示“未保存”；本地内容保留；optimistic cache 回滚；重试后可保存 |
| 外部更新 | 页面 A dirty，页面 B 修改另一个 block 并保存 | A 不静默覆盖 B；提示或合并行为符合当前产品契约；最终刷新保留两边修改 |
| 浮动标题 | 标题滚出和滚回 | `data-me-floating-header` 的 `aria-hidden` 正确；不遮住正文或顶部栏 |
| 保存状态 | clean、编辑、保存中、成功、失败 | 依次显示“已保存 / 编辑中 / 保存中 / 已保存 / 未保存” |

## 虚拟列表性能门禁

在 4000-block fixture、React Scan 关闭的桌面视口中记录 Chrome Performance trace：

- 稳态真实 block `<= 140`，MessageEditor 列表子树 DOM `< 1500`；
- 点击和连续输入 P95 `< 100ms`；
- 连续滚动 5 秒没有 `> 50ms` long task；
- 插入、删除、拆分、合并和远端回流后，首个可见 `blockId + top offset` 跳变 `< 16px`；
- 滚到文档深处再返回，mounted 数必须回落；
- `Cmd/Ctrl+A` 后滚到远处，新挂载行必须继续显示模型选区；
- 拖拽到视口上下 80px 边缘时持续滚动，source/target DOM 卸载后仍按 blockId 完成排序。

开发环境必须分别记录 React Scan 开启与关闭的结果。不同端口的登录态可能因 origin 隔离无法复用，CI 应通过专用 `storageState` 解决，不要复制真实账号存储。

## 三重保存证据

UI 出现“已保存”不能单独作为同步通过。每次写入型用例都必须同时证明：

1. 浏览器发出 `POST /chat/message/patch`。
2. request body 的 `mutationMeta.sourceSurface` 为 `doc_view`，`operations` 与本次编辑相符，响应为成功。
3. 重新加载页面后，`POST /chat/message/history` 返回的服务端消息能重建相同内容和顺序。

远端房间保存当前有 `10000ms` debounce，因此测试等待应以目标 response 或“已保存”状态为条件，并给出略高于 10 秒的超时；不要用固定 sleep 判断成功。

Playwright 中建议先等待 patch response，再读取 request body：

```ts
const patchResponsePromise = page.waitForResponse(response =>
  response.url().endsWith("/chat/message/patch")
  && response.request().method() === "POST",
);

// 执行输入、拆块、删除或排序。

const patchResponse = await patchResponsePromise;
expect(patchResponse.ok()).toBe(true);
const request = patchResponse.request().postDataJSON();
expect(request.mutationMeta.sourceSurface).toBe("doc_view");
expect(request.operations).toEqual(expect.arrayContaining([
  expect.objectContaining({ op: "update" }),
]));
```

## Fixture 与清理

- 每个测试使用 seed 中的稳定标记定位 block，不依赖当前 DOM 序号。
- suite 开始前 reset，测试失败后的 `afterAll` 再 reset；reset 失败应让 CI 失败并阻止并行复用该房间。
- 写入 marker 带 run id，例如 `e2e:<runId>:typing`，便于定位残留数据。
- 同步测试默认串行执行；同一 fixture 房间不能被多个 worker 并行写入。
- 截图、trace 和网络日志只能作为失败证据，不能替代刷新后的服务端回读。

## 最低 CI 门禁

每次修改 MessageEditor 至少执行：

1. 全部 MessageEditor Vitest。
2. P0 Playwright：光标、连续输入与 undo、跨块替换、保存并刷新、保存中继续编辑、虚拟化滚动。
3. `corepack pnpm typecheck:web`、定向 oxlint、`corepack pnpm build:web`。

夜间或合并前再执行失败 rollback、双页面外部更新、媒体上传和 4000-block 性能场景。
