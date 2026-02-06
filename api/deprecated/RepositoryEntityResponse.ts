// 手写占位类型：后端仓库实体相关接口已下线，但前端旧页面仍有类型依赖。
// 放在 api/deprecated 下，避免被 OpenAPI 代码生成覆盖。

export type RepositoryEntityInfo = {
  description?: string;
  desc?: string;
  image?: string;
  tip?: string;
  tips?: string;
  note?: string;

  act?: {
    kp?: boolean;
    [key: string]: unknown;
  };

  avatarIds?: number[];
  avatar?: string;
  modelName?: string;
  speakerName?: string;
  voiceUrl?: string;

  locations?: Array<string | undefined>;
  roles?: Array<string | undefined>;
  items?: Array<string | undefined>;

  moduleSceneName?: string;

  [key: string]: unknown;
};

export type RepositoryEntityResponse = {
  id?: number;
  name?: string;

  entityType?: number;
  versionId?: number;

  entityInfo?: RepositoryEntityInfo;

  [key: string]: unknown;
};
