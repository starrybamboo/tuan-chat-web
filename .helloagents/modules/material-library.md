# material-library

## 职责

负责局外素材包与局内素材包的查询、创建、编辑、删除、导入和工作区 UI。局内素材包页面 `SpaceMaterialLibraryPage` 现在由 URL 上的 `spacePackageId` 驱动具体素材包的选中态，因此可同时被聊天页空间详情和独立路由复用。

## 接口定义（可选）

### 公共 API
| 函数/方法 | 参数 | 返回值 | 说明 |
|----------|------|--------|------|
| `useSpaceMaterialPackagesQuery` | `SpaceMaterialPackagePageRequest` | `QueryResult` | 查询当前空间的素材包列表 |
| `useCreateSpaceMaterialPackageMutation` | `SpaceMaterialPackageCreateRequest` | `MutationResult` | 创建局内素材包 |
| `useUpdateSpaceMaterialPackageMutation` | `SpaceMaterialPackageUpdateRequest` | `MutationResult` | 更新局内素材包 |
| `useDeleteSpaceMaterialPackageMutation` | `{ spaceId, spacePackageId }` | `MutationResult` | 删除局内素材包 |
| `useImportSpaceMaterialPackageMutation` | `SpaceMaterialPackageImportRequest` | `MutationResult` | 从局外素材包导入到空间 |

### 数据结构
| 字段 | 类型 | 说明 |
|------|------|------|
| `SpaceMaterialPackageResponse.spacePackageId` | `number` | 局内素材包 ID |
| `SpaceMaterialPackageResponse.sourcePackageId` | `number` | 来源局外素材包 ID |
| `SpaceMaterialPackageResponse.content` | `MaterialPackageContent` | 素材包内容树 |

## 行为规范

### 局内素材包工作区
**条件**: 进入 `SpaceMaterialLibraryPage`  
**行为**: 查询局内素材包列表，并允许用户创建、编辑、删除或导入  
**结果**: 当前空间可维护自己的素材包副本

### URL 驱动的选中态
**条件**: URL 中存在 `spacePackageId`  
**行为**: 页面会打开对应素材包；创建、删除、关闭编辑器时同步更新查询参数  
**结果**: 侧边栏节点与素材包工作区共享同一套选中状态

### 素材包编辑器
**条件**: 打开创建或编辑弹层  
**行为**: 使用统一的 `MaterialPackageEditor` 工作台编辑封面、描述和素材内容树  
**结果**: 局内/局外素材包保持一致的编辑体验

### 删除后的失效清理
**条件**: 当前 URL 仍指向已被删除的素材包  
**行为**: 页面在查询完成后会清空失效的 `spacePackageId`  
**结果**: 不会保留已删除素材包的悬空弹层状态

## 依赖关系

```yaml
依赖:
  - api/hooks/materialPackageQueryHooks.ts
  - app/components/material/pages/spaceMaterialLibraryPage.tsx
  - app/components/material/components/spaceMaterialLibraryWorkspace.tsx
  - app/components/material/components/materialPackageImportModal.tsx
被依赖:
  - app/components/chat/space/drawers/spaceDetailPanel.tsx
  - app/routes/spaceMaterial.tsx
```
