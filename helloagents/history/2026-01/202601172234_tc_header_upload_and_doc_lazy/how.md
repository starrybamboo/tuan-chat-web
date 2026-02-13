# 技术设计: tc_header 图片上传修复 + 空间文档懒加载

## 技术方案

### 1) tc_header 图片上传（裁剪弹窗不显示）
- 根因：`app/root.tsx` 在 `blocksuite-frame` 分支直接 `return <Outlet />`，未渲染 `modal-root`，导致 `ToastWindow` 通过 `Mounter(targetId="modal-root")` 挂载失败，裁剪弹窗被直接丢弃。
- 修复：在 `blocksuite-frame` 分支同样渲染 `modal-root`（不引入全局 provider），让 Portal 弹窗可用。

### 2) 空间文档懒加载（避免全量加载）
- 根因：`SpaceWorkspace` 构造时触发 `_hydrateMissingTitles()`，为补齐标题会逐个 `doc.load()` 读取所有 subdocs（可导致空间内文档被全量加载）。
- 修复：取消构造/space 变更时的自动标题水合；标题改为“打开/编辑时通过现有同步机制写入 meta”。

### 3) 拉取后不写回（避免额外更新）
- 根因：`RemoteSnapshotDocSource.pull` 会在拉取后尝试 flush 本地队列并 `setRemoteSnapshot` 写回，造成“打开即 PUT”。
- 修复：pull 阶段仅合并本地队列用于当前会话呈现（返回 diff/state），不做远端写回；远端写回保留在 `push/flushInternal` 路径。

## 安全与性能

- **安全:** 不新增敏感数据持久化；保持 token 读取逻辑不变。
- **性能:** 避免标题水合导致的全量 subdoc `load()`；避免 pull 后立即写回造成额外网络与阻塞。

## 测试与验证

- `pnpm typecheck`
- `pnpm lint`（允许存在既有 warning）
