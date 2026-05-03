import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { UserRoleWithAvatarUrls } from "api/roleQueryCache";

import { tuanchat } from "@/../api/instance";
import { useGlobalContext } from "@/components/globalContextProvider";
import { ROLE_DEFAULT_AVATAR_URL } from "@/constants/defaultAvatar";
import { invalidateRoleCreateQueries } from "api/hooks/roleMutationInvalidation";
import { seedUserRoleQueryCache, upsertUserRoleListQueryCache } from "api/roleQueryCache";
import { ensureCreatedRoleDefaultAvatar } from "./createRoleDefaultAvatar";

import type { Role } from "../../types";

export type CreateRoleWithAbilityInput = {
  roleName: string;
  description: string;
  type?: number;
  spaceId?: number;
  ruleId?: number;
  act?: Record<string, string>;
  basic?: Record<string, string>;
  ability?: Record<string, string>;
  skill?: Record<string, string>;
};

export function useCreateRoleWithAbilityMutation() {
  const queryClient = useQueryClient();
  const userId = useGlobalContext().userId;

  return useMutation({
    mutationKey: ["createRoleWithAbility"],
    mutationFn: async (input: CreateRoleWithAbilityInput): Promise<Role> => {
      const createRes = await tuanchat.roleController.createRole({
        roleName: input.roleName,
        description: input.description,
        type: input.type ?? 0,
        spaceId: input.spaceId,
      });
      const roleId = createRes.data;
      if (!createRes.success || !roleId) {
        throw new Error(createRes.errMsg || "角色创建失败");
      }

      let avatarId = 0;
      const avatarUrl = ROLE_DEFAULT_AVATAR_URL;
      const avatarThumb = ROLE_DEFAULT_AVATAR_URL;

      try {
        const avatarCreateRes = await tuanchat.avatarController.setRoleAvatar({ roleId });
        const createdAvatarId = avatarCreateRes?.data;
        if (avatarCreateRes.success && createdAvatarId) {
          avatarId = createdAvatarId;
          await ensureCreatedRoleDefaultAvatar(queryClient, roleId, createdAvatarId);
          await tuanchat.roleController.updateRole({
            roleId,
            avatarId,
          });
        }
      }
      catch (error) {
        console.warn("默认头像上传失败", error);
      }

      if (input.ruleId && input.ruleId > 0) {
        await tuanchat.abilityController.setRoleAbility({
          ruleId: input.ruleId,
          roleId,
          act: input.act ?? {},
          basic: input.basic ?? {},
          ability: input.ability ?? {},
          skill: input.skill ?? {},
        });
      }

      const role: Role = {
        id: roleId,
        name: input.roleName,
        description: input.description,
        avatar: avatarUrl,
        avatarThumb,
        avatarId,
        type: input.type ?? 0,
        extra: {},
      };

      const userRole: UserRoleWithAvatarUrls = {
        userId: userId ?? 0,
        roleId,
        roleName: input.roleName,
        description: input.description,
        avatarId,
        avatarUrl,
        avatarThumbUrl: avatarThumb,
        type: input.type ?? 0,
        diceMaiden: input.type === 1,
        extra: {},
      };
      seedUserRoleQueryCache(queryClient, userRole);
      upsertUserRoleListQueryCache(queryClient, userRole);
      return role;
    },
    onSuccess: (role, variables) => {
      invalidateRoleCreateQueries(queryClient, variables.spaceId);
      queryClient.invalidateQueries({ queryKey: ["getRole", role.id] });
      queryClient.invalidateQueries({ queryKey: ["listRoleAbility", role.id] });
      queryClient.invalidateQueries({ queryKey: ["roleAbilityByRule", role.id, variables.ruleId] });
    },
  });
}
