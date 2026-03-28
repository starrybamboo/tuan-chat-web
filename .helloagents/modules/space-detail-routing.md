# space-detail-routing

## 职责

负责聊天页从 URL 解析空间上下文、房间/文档/空间详情状态，并决定主内容区渲染 `RoomWindow`、文档编辑器还是 `SpaceDetailPanel`。局内素材包通过空间详情页的 `material` tab 承载，并额外使用 `spacePackageId` 查询参数同步具体素材包选中态。

## 接口定义（可选）

### 公共 API
| 函数/方法 | 参数 | 返回值 | 说明 |
|----------|------|--------|------|
| `getSpaceDetailRouteTab` | `isPrivateChatMode`, `urlMessageId`, `urlRoomId` | `SpaceDetailTab \| null` | 判断当前 URL 是否命中空间详情路由 |
| `openSpaceDetailPanel` | `tab` | `void` | 导航到 `/chat/:spaceId/:tab` |
| `closeSpaceDetailPanel` | - | `void` | 从空间详情路由返回空间主页或最近房间 |
| `onSelectMaterialPackage` | `spacePackageId` | `void` | 导航到 `/chat/:spaceId/material?spacePackageId=:id` |

### 数据结构
| 字段 | 类型 | 说明 |
|------|------|------|
| `SpaceDetailTab` | `"members" \| "roles" \| "workflow" \| "trpg" \| "webgal" \| "setting" \| "material"` | 空间详情页支持的 tab |

## 行为规范

### 空间详情路由
**条件**: `urlRoomId` 命中 `SpaceDetailTab`  
**行为**: 主内容区渲染 `SpaceDetailPanel`，而不是聊天房间  
**结果**: 当前空间的成员、角色、素材包等面板在主区打开

### 局内素材包入口
**条件**: 用户从 `SpaceHeaderBar` 选择“局内素材包”  
**行为**: 调用 `openSpaceDetailPanel("material")`  
**结果**: `SpaceDetailPanel` 内嵌 `SpaceMaterialLibraryPage`

### 素材包节点路由
**条件**: 用户点击空间侧边栏中的素材包节点  
**行为**: 聊天页将 `spacePackageId` 写入查询参数，并导航到 `/chat/:spaceId/material`  
**结果**: 空间详情主内容区直接打开对应素材包，而不是只停留在素材包列表页

## 依赖关系

```yaml
依赖:
  - app/components/chat/hooks/chatPageRouteUtils.ts
  - app/components/chat/hooks/useChatPageDetailPanels.ts
  - app/components/chat/chatPageMainContent.tsx
  - app/components/chat/space/drawers/spaceDetailPanel.tsx
被依赖:
  - app/components/chat/chatPage.tsx
  - app/components/chat/space/spaceHeaderBar.tsx
```
