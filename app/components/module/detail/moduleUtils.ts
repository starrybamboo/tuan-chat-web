import type { StageEntityResponse } from "api/deprecated/StageEntityResponse";

// import { useAddEntityWithoutTypeMutation, useAddModuleMutation, useStagingQuery } from "api/hooks/moduleQueryHooks";

// 根据类型过滤实体数据的函数
export function getEntityListByType(
  moduleInfo: any,
  type: "item" | "role" | "scene" | "location",
): StageEntityResponse[] {
  // 创建类型映射：字符串 -> 数字
  const typeMap: Record<string, number> = {
    item: 1,
    role: 2,
    scene: 3,
    location: 4,
  };

  const numericType = typeMap[type];

  if (moduleInfo && Array.isArray(moduleInfo)
    && moduleInfo.every(item => "entityType" in item && "entityInfo" in item)) {
    return moduleInfo.filter(entity => entity.entityType === numericType);
  }
  const responses = moduleInfo?.data?.responses || [];
  return responses.filter((entity: StageEntityResponse) => entity.entityType === numericType);
}

// 将实体按照 versionId 做索引，方便在引用关系中快速查找
export function mapEntitiesByVersionId(
  entities: StageEntityResponse[],
): Record<string, StageEntityResponse> {
  return entities.reduce<Record<string, StageEntityResponse>>((acc, entity) => {
    if (entity.versionId !== undefined && entity.versionId !== null) {
      acc[String(entity.versionId)] = entity;
    }
    return acc;
  }, {});
}

// clone todo
// 1. 在工作区创建模组
// 2. 导入实体
