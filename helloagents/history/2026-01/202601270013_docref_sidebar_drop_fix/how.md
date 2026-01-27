# 技术设计: 修复文档拖拽到侧边栏无响应

## 技术方案

### 核心技术
- React + TypeScript
- HTML5 Drag & Drop（`DataTransfer`）
- 现有复制链路：`copyDocToSpaceDoc`

### 实现要点
- **DocRef 拖拽数据兼容性**
  - 在 `setDocRefDragData` 中同时写入：
    - 自定义 MIME：`application/x-tc-doc-ref`
    - `text/uri-list`：`tc-doc-ref:<docId>`（更稳定的兜底）
    - `text/plain`：仅在当前为空时写入同样的兜底前缀（避免破坏侧边栏内部排序/移动）
  - 在 `isDocRefDrag` 中增强识别：
    - 识别自定义 MIME / `text/uri-list` / `text/plain`（并排除 Files）
    - 当 `types` 不可靠时，尝试通过 `getDocRefDragData` 读取兜底前缀来判断

- **SidebarTree drop 触发保障**
  - 当前实现对 `isDocRefDrag(e.dataTransfer)` 的依赖可能导致 `preventDefault` 未执行，从而 drop 不触发。
  - 调整 `chatRoomListPanel.tsx` 的 dragover/drop：
    - dragover：在非内部拖拽（`dragging` 为空）且识别为 DocRef 时 `preventDefault`，并根据 `isSpaceOwner` 设置 `dropEffect` 为 `copy/none`
    - drop：优先读取 `getDocRefDragData`，识别成功后再 `preventDefault + stopPropagation` 并调用 `handleDropDocRefToCategory`
    - 非 KP：允许触发 drop，从 `handleDropDocRefToCategory` 给出 toast 提示（不发请求）

## 安全与性能
- **安全:** 不引入新权限通道；权限判断沿用既有 `isSpaceOwner`，无外部密钥/PII 写入。
- **性能:** dragover 仅做轻量识别与状态更新；避免在高频 dragover 中进行重计算或深拷贝。

## 测试与部署
- **测试（手动）:**
  1. 以 KP 身份：拖拽文档卡片到侧边栏分类 → 观察 Network 出现复制请求、toast 成功、分类下新增 doc 节点
  2. 以非 KP 身份：拖拽同样操作 → toast 提示无权限、无网络请求
  3. 侧边栏分类/节点排序拖拽 → 行为不受影响
- **部署:** 无额外部署步骤；随前端发布即可生效
