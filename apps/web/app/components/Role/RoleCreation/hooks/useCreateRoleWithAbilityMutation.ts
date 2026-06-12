import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { tuanchat } from "@/../api/instance";
import { useGlobalContext } from "@/components/globalContextProvider";
import { ROLE_DEFAULT_AVATAR_URL } from "@/constants/defaultAvatar";
import { avatarThumbUrl, avatarUrl } from "@/utils/mediaUrl";
import { invalidateRoleCreateQueries } from "api/hooks/roleMutationInvalidation";
import { seedUserRoleQueryCache, upsertUserRoleListQueryCache } from "api/roleQueryCache";

import type { Role } from "../../types";

import { ensureCreatedRoleDefaultAvatar } from "./createRoleDefaultAvatar";

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
      let avatarFileId: number | undefined;

      try {
        const avatarCreateRes = await tuanchat.avatarController.setRoleAvatar({ roleId });
        const createdAvatarId = avatarCreateRes?.data;
        if (avatarCreateRes.success && createdAvatarId) {
          avatarId = createdAvatarId;
          const defaultAvatar = await ensureCreatedRoleDefaultAvatar(queryClient, roleId, createdAvatarId);
          avatarFileId = defaultAvatar?.avatarFileId;
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

      const avatarSrc = avatarUrl(avatarFileId) || ROLE_DEFAULT_AVATAR_URL;
      const avatarThumb = avatarThumbUrl(avatarFileId) || avatarSrc;

      const role: Role = {
        id: roleId,
        name: input.roleName,
        description: input.description,
        avatar: avatarSrc,
        avatarThumb,
        avatarId,
        type: input.type ?? 0,
        extra: {},
      };

      const userRole: UserRole = {
        userId: userId ?? 0,
        roleId,
        roleName: input.roleName,
        description: input.description,
        avatarId,
        avatarFileId,
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
