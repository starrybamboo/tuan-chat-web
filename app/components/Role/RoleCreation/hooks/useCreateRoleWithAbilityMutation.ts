import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "@/../api/instance";
import { seedRoleAvatarQueryCaches } from "api/hooks/RoleAndAvatarHooks";
import { seedUserRoleQueryCache, upsertUserRoleListQueryCache } from "api/roleQueryCache";
import { invalidateRoleCreateQueries } from "api/hooks/roleMutationInvalidation";
import { ROLE_DEFAULT_AVATAR_URL } from "@/constants/defaultAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
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
      let avatarUrl = ROLE_DEFAULT_AVATAR_URL;
      let avatarThumb = ROLE_DEFAULT_AVATAR_URL;

      try {
        const avatarCreateRes = await tuanchat.avatarController.setRoleAvatar({ roleId });
        const createdAvatarId = avatarCreateRes?.data;
        if (avatarCreateRes.success && createdAvatarId) {
          const avatarUpdateRes = await tuanchat.avatarController.updateRoleAvatar({
            roleId,
            avatarId: createdAvatarId,
            avatarUrl: ROLE_DEFAULT_AVATAR_URL,
            avatarThumbUrl: ROLE_DEFAULT_AVATAR_URL,
            spriteUrl: ROLE_DEFAULT_AVATAR_URL,
          });
          avatarId = createdAvatarId;
          avatarUrl = avatarUpdateRes?.data?.avatarUrl || avatarUrl;
          avatarThumb = avatarUpdateRes?.data?.avatarThumbUrl || avatarUrl;
          if (avatarUpdateRes?.data) {
            seedRoleAvatarQueryCaches(queryClient, avatarUpdateRes.data, roleId);
          }
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

      const userRole: UserRole = {
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
      queryClient.invalidateQueries({ queryKey: ["getRoleAvatars", role.id] });
      queryClient.invalidateQueries({ queryKey: ["listRoleAbility", role.id] });
      queryClient.invalidateQueries({ queryKey: ["roleAbilityByRule", role.id, variables.ruleId] });
    },
  });
}
