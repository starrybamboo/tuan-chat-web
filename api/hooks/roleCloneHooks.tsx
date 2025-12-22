import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "../instance";
import type { Role } from "@/components/Role/types";

export type TargetType = "dicer" | "normal";

function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function cleanDicerFields(obj: any): any {
  if (!obj) return obj;
  const cleaned = deepCopy(obj);
  if (cleaned.extra && typeof cleaned.extra === "object") {
    delete cleaned.extra.dicerRoleId;
  }
  return cleaned;
}

interface CopyRoleArgs {
  sourceRole: Role;
  targetType: TargetType;
  newName: string;
  newDescription: string;
}

export function useCopyRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["copyRole"],
    mutationFn: async ({ sourceRole, targetType, newName, newDescription }: CopyRoleArgs): Promise<Role> => {
      const isSameType = sourceRole.type === (targetType === "dicer" ? 1 : 0);

      // 1. 创建新角色
      const createRes = await tuanchat.roleController.createRole({
        roleName: newName,
        description: newDescription,
        type: targetType === "dicer" ? 1 : 0,
      });
      const newRoleId = createRes?.data;
      if (!createRes?.success || !newRoleId || newRoleId <= 0) {
        throw new Error("角色创建失败");
      }

      let finalAvatarUrl = "/favicon.ico";
      let finalAvatarId: number | undefined;

      // 2. 复制所有头像（并行 + 容错）
      try {
        const sourceAvatarsRes = await tuanchat.avatarController.getRoleAvatars(sourceRole.id);
        const avatarList = sourceAvatarsRes?.data || [];

        const copyTasks = avatarList.map((sourceAvatar: any) => (async () => {
          const setRes = await tuanchat.avatarController.setRoleAvatar({ roleId: newRoleId });
          const newAvatarId = setRes?.data;
          if (!newAvatarId) throw new Error("创建新头像失败");

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

          return {
            sourceAvatarId: sourceAvatar.avatarId as number | undefined,
            newAvatarId: newAvatarId as number,
            avatarUrl: sourceAvatar.avatarUrl as string,
          };
        })());

        const results = await Promise.allSettled(copyTasks);
        const successes: Array<{ sourceAvatarId?: number; newAvatarId: number; avatarUrl: string }> = [];
        const failures: Array<any> = [];

        results.forEach((res, idx) => {
          if (res.status === "fulfilled") successes.push(res.value);
          else failures.push({ index: idx, reason: res.reason });
        });

        if (failures.length > 0) {
          console.warn(`部分头像复制失败，共 ${failures.length} 个`, failures);
        }

        const matched = successes.find(s => s.sourceAvatarId && s.sourceAvatarId === sourceRole.avatarId);
        const chosen = matched ?? successes[0];
        if (chosen) {
          await tuanchat.roleController.updateRole({ roleId: newRoleId, avatarId: chosen.newAvatarId });
          finalAvatarUrl = chosen.avatarUrl;
          finalAvatarId = chosen.newAvatarId;
        }
      } catch (e) {
        console.error("复制头像失败", e);
      }

      // 3. 同类型复制能力
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
        } catch (e) {
          console.error("复制能力数据失败", e);
        }
      } else {
        // 异类型复制：不创建能力组，仅清除骰娘专有字段
        // 留空以便后续用户手动添加
      }

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
    },
    onSuccess: (newRole) => {
      // 统一失效相关查询
      queryClient.invalidateQueries({ queryKey: ["getRole", newRole.id] });
      queryClient.invalidateQueries({ queryKey: ["getUserRoles"] });
      queryClient.invalidateQueries({ queryKey: ["roleInfinite"] });
      queryClient.invalidateQueries({ queryKey: ["getRoleAvatars", newRole.id] });
      queryClient.invalidateQueries({ queryKey: ["listRoleAbility", newRole.id] });
      queryClient.invalidateQueries({ queryKey: ["roleAbilityByRule"] });
    },
  });
}
