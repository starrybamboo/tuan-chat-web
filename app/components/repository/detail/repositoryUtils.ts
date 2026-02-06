import type { RepositoryEntityResponse } from "api/deprecated/RepositoryEntityResponse";

// import { useAddEntityWithoutTypeMutation, useAddRepositoryMutation, useStagingQuery } from "api/hooks/repositoryQueryHooks";

// 根据类型过滤实体数据的函数
export function getEntityListByType(
  repositoryInfo: any,
  type: "item" | "role" | "scene" | "location",
): RepositoryEntityResponse[] {
  // 创建类型映射：字符串 -> 数字
  const typeMap: Record<string, number> = {
    item: 1,
    role: 2,
    scene: 3,
    location: 4,
  };

  const numericType = typeMap[type];

  if (repositoryInfo && Array.isArray(repositoryInfo)
    && repositoryInfo.every(item => "entityType" in item && "entityInfo" in item)) {
    return repositoryInfo.filter(entity => entity.entityType === numericType);
  }
  const responses = repositoryInfo?.data?.responses || [];
  return responses.filter((entity: RepositoryEntityResponse) => entity.entityType === numericType);
}

// 将实体按照 versionId 做索引，方便在引用关系中快速查找
export function mapEntitiesByVersionId(
  entities: RepositoryEntityResponse[],
): Record<string, RepositoryEntityResponse> {
  return entities.reduce<Record<string, RepositoryEntityResponse>>((acc, entity) => {
    if (entity.versionId !== undefined && entity.versionId !== null) {
      acc[String(entity.versionId)] = entity;
    }
    return acc;
  }, {});
}

// clone todo
// 1. 在工作区创建仓库
// 2. 导入实体
