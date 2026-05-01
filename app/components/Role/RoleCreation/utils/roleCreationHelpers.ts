import type { Dispatch, SetStateAction } from "react";

import { ROLE_DEFAULT_AVATAR_URL } from "@/constants/defaultAvatar";

import type { Role } from "../../types";
import type { CharacterData } from "../types";

type CreateRoleFn = (payload: {
  roleName: string;
  description: string;
  type?: number;
  spaceId?: number;
}) => Promise<number | undefined | null>;

type UploadAvatarFn = (payload: { roleId: number }) => Promise<{ data?: { avatarId?: number; avatarFileId?: number } } | undefined>;

type SetRoleAbilityFn = (payload: {
  ruleId: number;
  roleId: number;
  act: CharacterData["act"];
  basic: CharacterData["basic"];
  ability: CharacterData["ability"];
  skill: CharacterData["skill"];
}) => void;

type UpdateRoleFn = (role: Role) => void;

type BeforeSetRoleAbilityHook = (data: CharacterData) => CharacterData;

export type SetSelectedRoleIdFn = Dispatch<SetStateAction<number | null>> | ((id: number | null) => void);

type RoleCreateDefaults = {
  type?: number;
  spaceId?: number;
};

type CompleteRoleCreationDeps = {
  characterData: CharacterData;
  createRole: CreateRoleFn;
  roleCreateDefaults?: RoleCreateDefaults;
  uploadAvatar: UploadAvatarFn;
  setRoleAbility: SetRoleAbilityFn;
  updateRole: UpdateRoleFn;
  setRoles?: Dispatch<SetStateAction<Role[]>>;
  setSelectedRoleId?: SetSelectedRoleIdFn;
  onComplete?: (role: Role, ruleId?: number) => void;
};

export async function completeRoleCreation(
  deps: CompleteRoleCreationDeps,
  beforeSetRoleAbility?: BeforeSetRoleAbilityHook,
): Promise<Role> {
  const {
    characterData,
    createRole,
    roleCreateDefaults,
    uploadAvatar,
    setRoleAbility,
    updateRole,
    setRoles,
    setSelectedRoleId,
    onComplete,
  } = deps;

  const trimmedName = characterData.name.trim();
  const trimmedDescription = characterData.description.trim();

  const roleId = await createRole({
    roleName: trimmedName,
    description: trimmedDescription,
    ...(roleCreateDefaults ?? {}),
  });
  if (!roleId && roleId !== 0)
    throw new Error("角色创建失败");

  let avatarId: number | undefined;
  try {
    const avatarRes = await uploadAvatar({ roleId });
    const responseAvatarId = avatarRes?.data?.avatarId;
    avatarId = typeof responseAvatarId === "number" ? responseAvatarId : undefined;
  }
  catch (error) {
    console.warn("默认头像创建失败", error);
  }

  if (characterData.ruleId > 0) {
    const processedData = beforeSetRoleAbility?.(characterData) ?? characterData;

    setRoleAbility({
      ruleId: processedData.ruleId,
      roleId,
      act: processedData.act,
      basic: processedData.basic,
      ability: processedData.ability,
      skill: processedData.skill,
    });
  }

  const newRole: Role = {
    id: roleId,
    name: trimmedName,
    description: trimmedDescription,
    avatar: ROLE_DEFAULT_AVATAR_URL,
    avatarId: avatarId ?? 0,
    type: roleCreateDefaults?.type,
  };

  if (setRoles)
    setRoles(prev => [newRole, ...prev]);
  if (setSelectedRoleId)
    setSelectedRoleId(newRole.id);

  updateRole(newRole);
  onComplete?.(newRole, characterData.ruleId);

  return newRole;
}
