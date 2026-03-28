# chat-sidebar-tree

## 职责

负责空间左侧侧边栏树的数据结构定义、默认树生成、归一化、拖拽排序、分类展开状态和节点渲染。当前树模型以 `SidebarTree` 为核心，叶子节点支持 `room`、`doc` 与 `material-package` 三类。

## 接口定义（可选）

### 公共 API
| 函数/方法 | 参数 | 返回值 | 说明 |
|----------|------|--------|------|
| `parseSidebarTree` | `treeJson` | `SidebarTree \| null` | 解析并兼容旧版 schema |
| `buildDefaultSidebarTree` | `roomsInSpace`, `docMetas`, `includeDocs` | `SidebarTree` | 生成默认的频道/文档分类树 |
| `normalizeSidebarTree` | `tree`, `roomsInSpace`, `docMetas`, `includeDocs` | `SidebarTree` | 过滤非法节点、补齐默认结构并去重 |
| `collectExistingMaterialPackageIds` | `tree` | `Set<number>` | 收集当前树中的素材包节点 ID |

### 数据结构
| 字段 | 类型 | 说明 |
|------|------|------|
| `SidebarLeafNode.type` | `"room" \| "doc" \| "material-package"` | 当前支持的叶子节点类型 |
| `SidebarCategoryNode.items` | `SidebarLeafNode[]` | 分类下的节点列表 |
| `SidebarTree.categories` | `SidebarCategoryNode[]` | 侧边栏分类集合 |
| `MATERIALS_CATEGORY_ID` | `"cat:materials"` | 系统素材包分类 ID |

## 行为规范

### 侧边栏树写入
**条件**: 用户对分类树执行拖拽、增删节点或重置默认树  
**行为**: 先本地更新，再通过 `useChatPageSidebarTree` 写入 localStorage 和后端 `space/sidebarTree`  
**结果**: 聊天页刷新后仍保留分类树结构

### 文档节点缓存
**条件**: 文档标题或封面发生变化  
**行为**: 将 fallback title/image 写回 `sidebarTree` 节点  
**结果**: 首屏可用缓存信息渲染文档节点

### 当前任务相关限制
**条件**: 当前空间存在局内素材包，旧 `treeJson` 中没有素材包分类  
**行为**: 归一化阶段会根据当前空间素材包列表自动补齐 `cat:materials`，并清理已经失效的素材包节点  
**结果**: 老空间无需手动重置侧边树也能出现素材包栏

## 依赖关系

```yaml
依赖:
  - app/components/chat/room/sidebarTree.ts
  - app/components/chat/room/chatRoomListPanel.tsx
  - app/components/chat/room/useRoomSidebar*
被依赖:
  - app/components/chat/chatPage.tsx
  - app/components/chat/chatPageSidePanelContent.tsx
```
