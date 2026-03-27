# Discover 模块知识库

## 范围
- chat 内“发现”入口，路径为 `/chat/discover`、`/chat/discover/my`、`/chat/discover/material` 与 `/chat/discover/material/my`。

## 当前实现（代码已验证）

### 页面结构
- `DiscoverPage` 负责布局，最左侧展示 `ChatSpaceSidebar`（空间列表），左侧导航为 `ChatDiscoverNavPanel`。
- 仓库发现主内容为 `DiscoverArchivedSpacesView`。
- 素材发现主内容复用 `MaterialLibraryPage`，以嵌入模式显示，不再展示页内 tab 切换。
- `ChatSpaceSidebar` 内的发现入口指向 `/chat/discover`。
- `ChatDiscoverNavPanel` 当前包含四个子入口：
  - 归档仓库 / 广场
  - 归档仓库 / 我的归档
  - 局外素材 / 素材广场
  - 局外素材 / 我的素材包

### Data Sources & Semantics
- Square: query `repositoryController.page()` (pageSize=60) and only show root repositories (`rootRepositoryId === repositoryId` or no `parentRepositoryId`).
- Mine: query `spaceController.getUserSpaces()` and filter archived spaces (`status === 2`), then group by `repositoryId`.
- Material square: query `materialPackageController.pagePublicPackages()`.
- Material mine: query `materialPackageController.pageMyPackages()`.
- Sorting: `updateTime` desc, then `createTime` desc.
- Search: repository name or description contains the keyword (case-insensitive).

### Interactions
- Discover 仓库卡片会在当前发现页内打开仓库详情面板，并通过 `repositoryId` query 参数切换详情态。
- 素材发现页保留素材包查看、编辑、新建、删除等原有能力；只是入口被挂到 discover 体系内。
- Space sidebar enters `/chat/{spaceId}`; private entry goes to `/chat/private`; create space jumps to `/chat?addSpacePop=true`.

### 相关数据模型
- `Space` 包含 `repositoryId` 与 `parentCommitId`，空间可映射到仓库或提交。
- `Repository` 关键字段：`repositoryId`、`repositoryName`、`parentRepositoryId`、`rootRepositoryId`、`commitId`。
- `MaterialPackageResponse` 关键字段：`packageId`、`name`、`description`、`isPublic`、`content`。

## 关联模块
- 仓库详情页（`/repository/detail/:id`）新增 fork 列表入口，展示根仓库的 fork 仓库选项。
- fork 列表数据来源：`repositoryController.pageForks()`。
