import type { StageEntityResponse, UserRole } from "../../api";

/**
 * 转换角色数据格式
 * @param original 原始角色数据
 * @returns 转换后的UserRole格式
 */
export function transformStageEntityToUserRole(original: StageEntityResponse): UserRole {
  return {
    userId: original.id!, // 使用原始id作为userId
    roleId: original.id!, // 使用原始id作为roleId
    roleName: original.name,
    description: original.entityInfo?.description,
    avatarId: original.entityInfo?.avatarIds?.[0], // 取第一个avatarId
    state: 0, // 默认状态为0(正常)
    modelName: original.entityInfo?.modelName,
    speakerName: original.entityInfo?.speakerName,
    voiceUrl: original.entityInfo?.voiceUrl,
    createTime: undefined, // 原始数据中没有这些字段
    updateTime: undefined,
  };
}
