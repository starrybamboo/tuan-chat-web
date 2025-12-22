import { tuanchat } from "api/instance";

import type { Role } from "../types";

type TargetType = "dicer" | "normal";

/**
 * 深拷贝对象
 */
function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 清除骰娘专有字段
 */
function cleanDicerFields(obj: any): any {
  if (!obj)
    return obj;
  const cleaned = deepCopy(obj);
  if (cleaned.extra && typeof cleaned.extra === "object") {
    delete cleaned.extra.dicerRoleId;
  }
  return cleaned;
}

/**
 * 复制角色
 * @param sourceRole 源角色
 * @param targetType 目标类型 ('dicer' 或 'normal')
 * @param newName 新角色名称
 * @param newDescription 新角色描述
 * @param mutations 包含所需 mutation 的对象
 * @returns 新角色对象
 */
export async function copyRole(
  sourceRole: Role,
  targetType: TargetType,
  newName: string,
  newDescription: string,
  mutations: {
    createRole: (data: { roleName: string; description: string; type?: number }) => Promise<number | undefined | null>;
    uploadAvatar: (data: { roleId: number; avatarUrl: string; spriteUrl: string }) => Promise<{ data?: { avatarId?: number; avatarUrl?: string } } | undefined>;
    updateRole: (data: any) => Promise<any>;
    getRoleAvatars: (roleId: number) => Promise<any>;
  },
): Promise<Role> {
  const isSameType = sourceRole.type === (targetType === "dicer" ? 1 : 0);

  // 1. 创建新角色
  const newRoleId = await mutations.createRole({
    roleName: newName,
    description: newDescription,
    type: targetType === "dicer" ? 1 : 0,
  });

  if (!newRoleId || newRoleId <= 0) {
    throw new Error("角色创建失败");
  }

  let finalAvatarUrl = "/favicon.ico";
  let finalAvatarId: number | undefined;

  // 2. 复制所有头像/立绘（两种类型都复制）
  try {
    const sourceAvatars = await mutations.getRoleAvatars(sourceRole.id);
    const avatarList = sourceAvatars?.data || [];

    // 复制所有头像
    for (const sourceAvatar of avatarList) {
      const setRes = await tuanchat.avatarController.setRoleAvatar({ roleId: newRoleId });
      const newAvatarId = setRes?.data;

      if (newAvatarId) {
        await tuanchat.avatarController.updateRoleAvatar({
          roleId: newRoleId,
          avatarId: newAvatarId,
          avatarUrl: sourceAvatar.avatarUrl,
          spriteUrl: sourceAvatar.spriteUrl || "",
          spriteXPosition: sourceAvatar.spriteXPosition ?? 0,
          spriteYPosition: sourceAvatar.spriteYPosition ?? 0,
          spriteScale: sourceAvatar.spriteScale ?? 1,
          spriteTransparency: sourceAvatar.spriteTransparency ?? 1,
          spriteRotation: sourceAvatar.spriteRotation ?? 0,
        });

        // 如果这是当前选中的头像，更新 finalAvatarId
        if (sourceRole.avatarId === sourceAvatar.avatarId) {
          await mutations.updateRole({
            roleId: newRoleId,
            avatarId: newAvatarId,
          });
          finalAvatarUrl = sourceAvatar.avatarUrl;
          finalAvatarId = newAvatarId;
        }
      }
    }
  }
  catch (e) {
    console.error("复制头像失败", e);
    // 继续执行，头像复制失败不中断流程
  }

  // 3. 仅在同类型复制时，复制能力数据
  if (isSameType) {
    try {
      const sourceAbilitiesRes = await tuanchat.abilityController.listRoleAbility(sourceRole.id);
      const sourceAbilities = sourceAbilitiesRes?.data || [];

      for (const ability of sourceAbilities) {
        const newAbilityData = deepCopy({
          act: ability.act || {},
          basic: ability.basic || {},
          ability: ability.ability || {},
          skill: ability.skill || {},
          extra: ability.extra || {},
        });

        if (ability.ruleId !== undefined) {
          await tuanchat.abilityController.setRoleAbility({
            ruleId: ability.ruleId,
            roleId: newRoleId,
            act: newAbilityData.act,
            basic: newAbilityData.basic,
            ability: newAbilityData.ability,
            skill: newAbilityData.skill,
            extra: newAbilityData.extra,
          });
        }
      }
    }
    catch (e) {
      console.error("复制能力数据失败", e);
      // 继续执行，能力复制失败不中断流程
    }
  }
  else {
    // 异类型复制：不创建能力组，仅清除骰娘专有字段
    try {
      // 如果源角色有默认规则，创建一个空的能力组框架（可选）
      // 这里暂不创建，让用户后续手动添加
    }
    catch (e) {
      console.error("处理异类型复制失败", e);
    }
  }

  // 4. 返回新角色对象
  const newRole: Role = {
    id: newRoleId,
    name: newName,
    description: newDescription,
    avatar: finalAvatarUrl,
    avatarId: finalAvatarId ?? 0,
    type: targetType === "dicer" ? 1 : 0,
    modelName: sourceRole.modelName,
    speakerName: sourceRole.speakerName,
    voiceUrl: sourceRole.voiceUrl,
    extra: isSameType ? sourceRole.extra : cleanDicerFields(sourceRole.extra),
  };

  return newRole;
}
