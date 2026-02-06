# Discover 模块知识库

## 范围
- chat 内“发现”入口，路径为 `/chat/discover` 与 `/chat/discover/my`。

## 当前实现（代码已验证）

### 页面结构
- `DiscoverPage` 负责布局，最左侧展示 `ChatSpaceSidebar`（空间列表），左侧导航为 `ChatDiscoverNavPanel`，主内容为 `DiscoverArchivedSpacesView`。
- `ChatSpaceSidebar` 内的发现入口指向 `/chat/discover`。

### 数据来源与业务含义
- 广场：拉取仓库分页 `repositoryController.page()`（当前 `pageSize=60`），仅展示根仓库（`rootRepositoryId === repositoryId` 或无 `parentRepositoryId`）。
- 我的归档：拉取 `spaceController.listArchivedSpacesMy()`，筛选 `Space.status === 2` 且含 `repositoryId` 的空间，按 `repositoryId` 聚合为仓库。
- 归档仓库信息：按聚合得到的 `repositoryId` 批量调用 `repositoryController.getById()` 以补全仓库信息。
- 排序规则：按 `updateTime` 优先、`createTime` 次之的倒序。
- 搜索规则：名称或描述包含关键词（大小写不敏感），我的归档优先用仓库字段，缺失时回退到空间字段。

### 交互
- “查看仓库”跳转 `/repository/detail/:id`。
- 我的归档支持展开归档列表，列表项可进入 `/chat/{spaceId}`。
- 空间列表点击进入 `/chat/{spaceId}`，私聊入口进入 `/chat/private`，创建空间跳转到 `/chat?addSpacePop=true`。

### 相关数据模型
- `Space` 包含 `repositoryId` 与 `parentCommitId`，空间可映射到仓库或提交。
- `Repository` 关键字段：`repositoryId`、`repositoryName`、`parentRepositoryId`、`rootRepositoryId`、`commitId`。

## 关联模块
- 仓库详情页（`/repository/detail/:id`）新增 fork 列表入口，展示根仓库的 fork 仓库选项。
- fork 列表数据来源：`repositoryController.pageForks()`。
