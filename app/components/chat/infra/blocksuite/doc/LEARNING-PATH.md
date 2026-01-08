# BlockSuite 学习路线（给 React 初学者）

本文档面向“学了一点 React 的前端新手”，目标是让你能从 **BlockSuite 源码**与**本项目（tuan-chat-web）的集成代码**两条线并行入门，避免一上来就陷入过深的框架细节。

你的 BlockSuite 本地仓库路径：`D:\A_programming\blocksuite`

---

## 0. TL;DR（推荐顺序）

1. **先跑起来**：在 BlockSuite 仓库按 `BUILDING.md` 跑 Playground（能编辑=入门成功）
2. **再看概念**：Store（数据）→ Std（渲染宿主）→ View/Store Extensions（能力拼装）→ Sync（协作/持久化管线）
3. **最后回到本项目**：从本项目的 `spec + runtime + editor-host` 三处入口，理解“我们到底用到了 BlockSuite 的哪一层”

---

## 1. 在 BlockSuite 仓库先跑通 Playground（最重要）

必读：
- `D:\A_programming\blocksuite\README.md`
- `D:\A_programming\blocksuite\BUILDING.md`

最小成功标准：
- `yarn install` + `yarn dev` 能启动
- 打开 `http://localhost:5173/starter/?init` 能编辑、能输入、能插入基础块（你不用立刻理解所有机制）

建议你先把下面 3 个 URL 都点开一次，感受差异：
- `http://localhost:5173/starter/?init`（推荐调试入口）
- `http://localhost:5173/starter/`（预设列表）
- `http://localhost:5173`（更综合的示例，包含本地存储与协作体验）

---

## 2. BlockSuite 仓库的“读代码顺序”（按学习收益排序）

### 2.1 先定位仓库结构

- `D:\A_programming\blocksuite\packages\playground`：能跑起来的示例（优先看）
- `D:\A_programming\blocksuite\packages\framework\store`：文档数据层（Doc/Block tree/ExtensionType 等）
- `D:\A_programming\blocksuite\packages\framework\std`：渲染与交互宿主（把 store + view extensions 变成 editor-host）
- `D:\A_programming\blocksuite\packages\framework\sync`：同步/持久化/协作相关管线
- `D:\A_programming\blocksuite\packages\affine`：AFFiNE 风格 preset（blocks、widgets、UI 相关聚合）

### 2.2 建议阅读目标（你不需要“全看懂”）

你只需要回答这些问题，就算入门：
- **数据长什么样**：一个 Doc 是怎样由 blocks 组成的？block 的 schema/props 在哪里定义？
- **怎么渲染**：为什么“同一份数据”能以 Page/Edgeless 两种模式呈现？
- **能力怎么拼装**：store extensions vs view extensions 各负责什么？
- **协作怎么接入**：Yjs updates 在哪里产生/消费？sync 管线怎样把 updates 写到存储/发到网络？

---

## 3. 结合 tuan-chat-web：从哪里开始看“我们怎么集成的”

先把本项目的这 4 个入口文件当成地图（按推荐顺序）：

1. **Spec（能力拼装）**
   - `app/components/chat/infra/blocksuite/spec/affineSpec.ts`
   - 你要理解：我们注册了哪些 blocks、widgets/fragments（它们决定“标题/SlashMenu/toolbar 是否出现”）

2. **Workspace/Doc/Store 运行时（数据与存储管线）**
   - `app/components/chat/infra/blocksuite/runtime/spaceWorkspace.ts`
   - `app/components/chat/infra/blocksuite/spaceWorkspaceRegistry.ts`
   - 你要理解：Space≈Workspace、root Y.Doc + subdoc 的组织方式、IndexedDB 的持久化边界

3. **UI 渲染入口（把 editor-host 放进 React）**
   - `app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx`
   - 你要理解：React 只负责挂载宿主与传参，编辑器核心是 Web Components + std 渲染树

4. **Demo/路由入口（方便你断点调试）**
   - `app/routes/docTest.tsx`

配套阅读：
- `INTERNAL-DATA.md`（术语对照）
- `TROUBLESHOOTING.md`（遇到“标题没了/SlashMenu 不出/Edgeless 不能切”等时直接查）

---

## 4. 给新手的练习任务（从易到难）

建议你按顺序做，不要跳：

1. 在 `docTest` 页面里把 `spaceId/docId` 固定成你方便复现的值，确保刷新后数据仍在（验证 IndexedDB）
2. 在 `blocksuiteDescriptionEditor.tsx` 里加一个“只读/可编辑”的切换（理解编辑器的受控边界）
3. 给 `affineSpec.ts` 加/减一个 widget view extension，然后观察 UI 变化（标题/toolbar/SlashMenu）
4. 追踪一次“输入一个字符”从 DOM → selection/rich-text → Yjs update → 存储的链路（只要能画出数据流就算成功）

