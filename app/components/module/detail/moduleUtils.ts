import type { StageEntityResponse } from "api/models/StageEntityResponse";

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

// 扩展场景实体，添加物品和角色信息
export function getEnhancedSceneList(moduleInfo: any): (StageEntityResponse & {
  sceneItems?: string[];
  sceneRoles?: string[];
  sceneLocations?: string[];
})[] {
  const sceneList = getEntityListByType(moduleInfo, "scene");
  const moduleMap = moduleInfo?.data?.moduleMap;
  const sceneItemMap = moduleMap?.sceneItem || {};
  const sceneRoleMap = moduleMap?.sceneRole || {};
  const sceneLocationMap = moduleMap?.sceneLocation || {};

  return sceneList.map(scene => ({
    ...scene,
    sceneItems: sceneItemMap[scene.name || ""] || [],
    sceneRoles: sceneRoleMap[scene.name || ""] || [],
    sceneLocations: sceneLocationMap[scene.name || ""] || [],
  }));
}

// 获取所有类型的实体数据
export function getAllEntityLists(moduleInfo: any) {
  return {
    itemList: getEntityListByType(moduleInfo, "item"),
    roleList: getEntityListByType(moduleInfo, "role"),
    locationList: getEntityListByType(moduleInfo, "location"),
    sceneList: getEnhancedSceneList(moduleInfo),
  };
}
