type SectionName = "act" | "basic" | "ability" | "skill";

const fieldSectionMap = {
  act: "actFields",
  basic: "basicFields",
  ability: "abilityFields",
  skill: "skillFields",
} as const satisfies Record<SectionName, string>;

export function buildRoleAbilitySectionUpdatePayload(
  roleId: number,
  ruleId: number,
  section: SectionName,
  data: Record<string, string>,
) {
  return {
    roleId,
    ruleId,
    [section]: data,
  };
}

export function buildRoleAbilityFieldKeyPayload(
  roleId: number,
  ruleId: number,
  section: SectionName,
  fields: Record<string, string | null>,
) {
  return {
    roleId,
    ruleId,
    [fieldSectionMap[section]]: fields,
  };
}
