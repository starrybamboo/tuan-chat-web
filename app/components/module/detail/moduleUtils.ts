import type { StageEntityResponse } from "api/models/StageEntityResponse";

// 根据类型过滤实体数据的函数
export function getEntityListByType(
  moduleInfo: StageEntityResponse[] | undefined,
  type: "item" | "role" | "scene",
): StageEntityResponse[] {
  if (!moduleInfo) {
    return [];
  }
  else {
    return moduleInfo.filter(entity => entity.entityType === type);
  }
}

// 扩展场景实体，添加物品和角色信息
export function getEnhancedSceneList(moduleInfo: any): (StageEntityResponse & {
  sceneItems?: string[];
  sceneRoles?: string[];
})[] {
  const sceneList = getEntityListByType(moduleInfo, "scene");
  const moduleMap = moduleInfo?.data?.moduleMap;
  const sceneItemMap = moduleMap?.sceneItem || {};
  const sceneRoleMap = moduleMap?.sceneRole || {};

  return sceneList.map(scene => ({
    ...scene,
    sceneItems: sceneItemMap[scene.name || ""] || [],
    sceneRoles: sceneRoleMap[scene.name || ""] || [],
  }));
}

// 获取所有类型的实体数据
export function getAllEntityLists(moduleInfo: any) {
  return {
    itemList: getEntityListByType(moduleInfo, "item"),
    roleList: getEntityListByType(moduleInfo, "role"),
    sceneList: getEnhancedSceneList(moduleInfo),
  };
}
