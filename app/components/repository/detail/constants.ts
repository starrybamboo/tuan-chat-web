// 默认仓库数据 - 使用更真实的默认值避免假数据错觉
export const DEFAULT_REPOSITORY_DATA = {
  repositoryId: 1,
  ruleId: 1,
  ruleName: null as string | null,
  repositoryName: "加载中...",
  description: "正在获取仓库信息...",
  userId: undefined as number | undefined,
  authorName: null as string | null,
  minTime: null as number | null,
  maxTime: null as number | null,
  parent: null as string | null,
  minPeople: null as number | null,
  maxPeople: null as number | null,
  image: "",
  createTime: null as string | null,
  updateTime: null as string | null,
  readMe: null as string | null,
};

export type RepositoryData = typeof DEFAULT_REPOSITORY_DATA;
