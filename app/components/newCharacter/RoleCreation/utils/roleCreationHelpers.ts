import type { Dispatch, SetStateAction } from "react";

import UNTIL from "@/components/common/dicer/utils";

import type { Role } from "../../types";
import type { CharacterData } from "../types";

type CreateRoleFn = (payload: { roleName: string; description: string }) => Promise<number | undefined | null>;

type UploadAvatarFn = (payload: { avatarUrl: string; spriteUrl: string; roleId: number }) => Promise<{ data?: { avatarId?: number; avatarUrl?: string } } | undefined>;

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

type CompleteRoleCreationDeps = {
  characterData: CharacterData;
  createRole: CreateRoleFn;
  uploadAvatar: UploadAvatarFn;
  setRoleAbility: SetRoleAbilityFn;
  updateRole: UpdateRoleFn;
  setRoles?: Dispatch<SetStateAction<Role[]>>;
  setSelectedRoleId?: SetSelectedRoleIdFn;
  onComplete?: (role: Role, ruleId?: number) => void;
};

type CompleteRoleCreationOptions = {
  beforeSetRoleAbility?: BeforeSetRoleAbilityHook;
};

export async function completeRoleCreation(
  deps: CompleteRoleCreationDeps,
  options: CompleteRoleCreationOptions = {},
): Promise<Role> {
  const {
    characterData,
    createRole,
    uploadAvatar,
    setRoleAbility,
    updateRole,
    setRoles,
    setSelectedRoleId,
    onComplete,
  } = deps;

  const trimmedName = characterData.name.trim();
  const trimmedDescription = characterData.description.trim();

  const roleId = await createRole({ roleName: trimmedName, description: trimmedDescription });
  if (!roleId && roleId !== 0)
    throw new Error("角色创建失败");

  let avatarId: number | undefined;
  let avatarUrl: string | undefined;
  try {
    const avatarRes = await uploadAvatar({ avatarUrl: "/favicon.ico", spriteUrl: "/favicon.ico", roleId });
    const responseAvatarId = avatarRes?.data?.avatarId;
    avatarId = typeof responseAvatarId === "number" ? responseAvatarId : undefined;
    avatarUrl = avatarRes?.data?.avatarUrl;
  }
  catch (error) {
    console.warn("默认头像上传失败", error);
  }

  if (characterData.ruleId > 0) {
    const processedData = options.beforeSetRoleAbility?.(characterData) ?? characterData;

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
    avatar: avatarUrl || "/favicon.ico",
    avatarId: avatarId ?? 0,
    modelName: "散华",
    speakerName: "鸣潮",
  };

  if (setRoles)
    setRoles(prev => [newRole, ...prev]);
  if (setSelectedRoleId)
    setSelectedRoleId(newRole.id);

  updateRole(newRole);
  onComplete?.(newRole, characterData.ruleId);

  return newRole;
}

export function evaluateCharacterDataExpressions(data: CharacterData): CharacterData {
  const nextData: CharacterData = {
    ...data,
    act: { ...data.act },
    basic: { ...data.basic },
    ability: { ...data.ability },
    skill: { ...data.skill },
  };

  for (const key of Object.keys(nextData.ability)) {
    const rawValue = nextData.ability[key];
    if (Number.isNaN(Number(rawValue)))
      nextData.ability[key] = String(safeCalculateExpression(rawValue, key, "ability", nextData));
  }

  for (const key of Object.keys(nextData.skill)) {
    const rawValue = nextData.skill[key];
    if (Number.isNaN(Number(rawValue)))
      nextData.skill[key] = String(safeCalculateExpression(rawValue, key, "skill", nextData));
  }

  return nextData;
}

function safeCalculateExpression(
  expression: string,
  key: string,
  section: "ability" | "skill",
  data: CharacterData,
): number {
  try {
    return UNTIL.calculateExpression(expression, data);
  }
  catch (error) {
    // Provide context for invalid expressions to simplify debugging.
    console.error("角色属性表达式计算失败", {
      section,
      key,
      expression,
      ability: data.ability,
      skill: data.skill,
      error,
    });
    throw error;
  }
}
