import type { StageEntityResponse } from "api/models/StageEntityResponse";

// 根据类型过滤实体数据的函数
export function getEntityListByType(
  moduleInfo: any,
  type: "item" | "role" | "scene",
): StageEntityResponse[] {
  const responses = moduleInfo?.data?.responses || [];
  return responses.filter((entity: StageEntityResponse) => entity.entityType === type);
}

// 获取所有类型的实体数据
export function getAllEntityLists(moduleInfo: any) {
  return {
    itemList: getEntityListByType(moduleInfo, "item"),
    roleList: getEntityListByType(moduleInfo, "role"),
    sceneList: getEntityListByType(moduleInfo, "scene"),
  };
}
