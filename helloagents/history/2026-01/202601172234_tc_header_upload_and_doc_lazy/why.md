# 变更提案: tc_header 图片上传修复 + 空间文档懒加载

## 需求背景

1. `tc_header` 头像上传入口在 `blocksuite-frame`（iframe）中不可用：选择图片后不出现裁剪弹窗，导致无法完成上传。
2. 打开任意空间文档时会触发“全量加载该空间所有文档”，并在拉取后产生额外更新写回，导致打开/切换空间明显卡顿。

## 变更内容

1. 让 `blocksuite-frame` 也具备 `modal-root`，确保 ToastWindow/裁剪上传等 Portal 组件可渲染。
2. 移除 workspace 初始化阶段的“标题水合”逻辑，避免为了补齐标题而加载所有 subdocs。
3. 调整远端 doc source：拉取阶段不再触发远端写回（仅合并本地队列用于当前会话呈现），避免打开文档出现额外 PUT。

## 影响范围

- **模块:** Blocksuite（iframe 宿主 / workspace runtime / remote doc source）
- **文件:**
  - `app/root.tsx`
  - `app/components/chat/infra/blocksuite/runtime/spaceWorkspace.ts`
  - `app/components/chat/infra/blocksuite/remoteDocSource.ts`
- **API:** `/blocksuite/doc`（不改接口，仅调整客户端调用时机）
- **数据:** 本地 `descriptionDocDb` 队列仍保留，远端写回改为由 push/flush 触发

## 核心场景

### 需求: tc_header 图片可上传
**模块:** Blocksuite
在 `tc_header` 点击头像上传图片后，能弹出裁剪弹窗并成功上传，最终写入 `tc_header.imageUrl`。

#### 场景: 在 blocksuite-frame 中上传头像
- 条件：打开任意启用 `tcHeader` 的描述/文档页
- 预期结果：选择图片后出现裁剪弹窗；点击“完成”后上传成功并更新头像

### 需求: 打开文档不全量加载空间文档
**模块:** Blocksuite
打开空间内任意文档时，仅加载当前文档相关的数据，不再为补齐标题而加载空间所有文档，也不应在 pull 后自动触发远端写回。

#### 场景: 打开空间文档
- 条件：进入空间并打开任意文档
- 预期结果：不触发空间内所有文档的加载；网络请求不出现“拉取后立即写回”的额外更新

## 风险评估

- **风险:** 取消“全量标题水合”后，linked-doc 列表里未打开过的文档标题可能为空
- **缓解:** 标题由业务侧 `tc_header.title`/workspace meta 同步驱动；如需进一步完善，可后续新增“按需水合（仅在打开 linked-doc 菜单时）”策略
