import type { StageEntityResponse } from "api/models/StageEntityResponse";

import { useAddEntityWithoutTypeMutation, useAddModuleMutation, useStagingQuery } from "api/hooks/moduleQueryHooks";

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

// // 扩展场景实体，添加物品和角色信息
// export function getEnhancedSceneList(moduleInfo: any): (StageEntityResponse & {
//   sceneItems?: string[];
//   sceneRoles?: string[];
//   sceneLocations?: string[];
// })[] {
//   const sceneList = getEntityListByType(moduleInfo, "scene");
//   const moduleMap = moduleInfo?.data?.moduleMap;
//   const sceneItemMap = moduleMap?.sceneItem || {};
//   const sceneRoleMap = moduleMap?.sceneRole || {};
//   const sceneLocationMap = moduleMap?.sceneLocation || {};

//   return sceneList.map(scene => ({
//     ...scene,
//     sceneItems: sceneItemMap[scene.name || ""] || [],
//     sceneRoles: sceneRoleMap[scene.name || ""] || [],
//     sceneLocations: sceneLocationMap[scene.name || ""] || [],
//   }));
// }

// 获取所有类型的实体数据
export function getAllEntityLists(moduleInfo: any) {
  return {
    itemList: getEntityListByType(moduleInfo, "item"),
    roleList: getEntityListByType(moduleInfo, "role"),
    locationList: getEntityListByType(moduleInfo, "location"),
    sceneList: getEntityListByType(moduleInfo, "scene"),
  };
}

// clone todo
// 1. 在工作区创建模组
// 2. 导入实体

export function useCloneModule(moduleData: any, moduleInfo: any) {
  const addModuleMutation = useAddModuleMutation();
  const addEntityMutation = useAddEntityWithoutTypeMutation();
  const { refetch: refetchStaging } = useStagingQuery();

  const cloneModule = async () => {
    if (!moduleData) {
      throw new TypeError("moduleData is required");
    }

    // 构建新模组的数据
    const newModuleData = {
      moduleName: `${moduleInfo.moduleName}_copy`, // 在原名称后添加_copy
      description: moduleInfo.description,
      ruleId: moduleInfo.ruleId,
      minPeople: moduleInfo.minPeople,
      maxPeople: moduleInfo.maxPeople,
      minTime: moduleInfo.minTime,
      maxTime: moduleInfo.maxTime,
      image: moduleInfo.image,
      instruction: moduleInfo.instruction,
      authorName: moduleInfo.authorName,
    };

    // 添加调试信息
    console.warn("准备创建模组，数据:", newModuleData);
    console.warn("原始模组数据:", moduleData);

    // 验证必需字段
    if (!newModuleData.ruleId) {
      throw new TypeError("ruleId is required but missing");
    }
    if (!newModuleData.moduleName) {
      throw new TypeError("moduleName is required but missing");
    }

    // 1. 创建新模组
    const res = await addModuleMutation.mutateAsync(newModuleData);
    const newModuleId = res.data;

    if (!newModuleId) {
      throw new TypeError("Failed to create new module");
    }

    console.warn("新模组创建成功，ID:", newModuleId);

    // 2. 通过 useStagingQuery 获取对应的 stageId
    console.warn("重新查询 staging 数据以获取 stageId...");
    await refetchStaging();

    // 查找新创建模组对应的 stage 数据
    const updatedStagingData = await refetchStaging();
    const stagingList = updatedStagingData.data?.data || [];
    const newStageData = stagingList.find((stage: any) => stage.moduleId === newModuleId);

    if (!newStageData || !newStageData.stageId) {
      console.error("无法找到新创建模组的 stage 数据:", { newModuleId, stagingList });
      throw new TypeError(`Failed to find stageId for new module ${newModuleId}`);
    }

    const newStageId = newStageData.stageId;
    console.warn("找到对应的 stageId:", newStageId);

    // 3. 获取原模组的实体数据
    const responses = moduleData?.data?.responses || [];
    const moduleMap = moduleData?.data?.moduleMap || {};

    console.warn("原模组实体数据概览:", {
      responsesCount: responses.length,
      moduleMapKeys: Object.keys(moduleMap),
    });

    // 4. 创建 EntityType 为 5 的模组实体 (map)
    const mapEntityData = {
      stageId: newStageId, // 使用正确的 stageId
      entityType: 5,
      name: `${moduleInfo.moduleName}_copy`,
      entityInfo: moduleMap,
    };
    console.warn("准备创建 map 实体，数据:", mapEntityData);

    try {
      await addEntityMutation.mutateAsync(mapEntityData);
      console.warn("map 实体创建成功");
    }
    catch (error) {
      console.error("创建 map 实体失败:", error);
      throw error;
    }

    // 5. 复制所有其他实体
    console.warn("开始复制实体，总数:", responses.length);
    for (let i = 0; i < responses.length; i++) {
      const entity = responses[i];

      // 为复制的实体名称添加后缀，避免重复名称
      const copiedEntityName = `${entity.name}_copy`;

      const entityData = {
        stageId: newStageId, // 使用正确的 stageId
        entityType: entity.entityType,
        name: copiedEntityName,
        entityInfo: entity.entityInfo,
      };

      console.warn(`准备创建第 ${i + 1}/${responses.length} 个实体: ${copiedEntityName} (类型: ${entity.entityType})`);

      try {
        await addEntityMutation.mutateAsync(entityData);
        console.warn(`第 ${i + 1} 个实体创建成功: ${copiedEntityName}`);
      }
      catch (error) {
        console.error(`创建第 ${i + 1} 个实体失败:`, error);
        console.error("失败的实体数据:", entityData);
        throw error;
      }
    }

    // 返回新模组的ID
    return newModuleId;
  };

  return {
    cloneModule,
    isLoading: addModuleMutation.isPending || addEntityMutation.isPending,
    error: addModuleMutation.error || addEntityMutation.error,
  };
}
