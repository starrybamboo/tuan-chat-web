# Discover 模块知识库

## 范围
- chat 内“发现”入口，路径为 `/chat/discover` 与 `/chat/discover/my`。

## 当前实现（代码已验证）

### 页面结构
- `DiscoverPage` 负责布局，最左侧展示 `ChatSpaceSidebar`（空间列表），左侧导航为 `ChatDiscoverNavPanel`，主内容为 `DiscoverArchivedSpacesView`。
- `ChatSpaceSidebar` 内的发现入口指向 `/chat/discover`。

### Data Sources & Semantics
- Square: query `repositoryController.page()` (pageSize=60) and only show root repositories (`rootRepositoryId === repositoryId` or no `parentRepositoryId`).
- Mine: query `repositoryController.pageByUserId()` to show repositories released by the current user.
- Sorting: `updateTime` desc, then `createTime` desc.
- Search: repository name or description contains the keyword (case-insensitive).

### Interactions
- "View Repository" navigates to `/repository/detail/:id`.
- Space sidebar enters `/chat/{spaceId}`; private entry goes to `/chat/private`; create space jumps to `/chat?addSpacePop=true`.

### 相关数据模型
- `Space` 包含 `repositoryId` 与 `parentCommitId`，空间可映射到仓库或提交。
- `Repository` 关键字段：`repositoryId`、`repositoryName`、`parentRepositoryId`、`rootRepositoryId`、`commitId`。

## 关联模块
- 仓库详情页（`/repository/detail/:id`）新增 fork 列表入口，展示根仓库的 fork 仓库选项。
- fork 列表数据来源：`repositoryController.pageForks()`。
