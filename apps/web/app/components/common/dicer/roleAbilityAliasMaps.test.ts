import { describe, expect, it } from "vitest";

import { COC_ABILITY_ALIASES, createRoleAbilityAliasMapSet, resolveRoleAbilityAlias } from "./roleAbilityAliasMaps";

describe("roleAbilityAliasMaps", () => {
  it("COC 别名表将巧手归一到妙手", () => {
    expect(COC_ABILITY_ALIASES.巧手).toBe("妙手");
    expect(createRoleAbilityAliasMapSet()[1].get("巧手")).toBe("妙手");
  });

  it("resolveRoleAbilityAlias 统一处理空白、大小写和默认字段名", () => {
    expect(resolveRoleAbilityAlias(" str ", COC_ABILITY_ALIASES)).toBe("力量");
    expect(resolveRoleAbilityAlias("DEX", COC_ABILITY_ALIASES)).toBe("敏捷");
    expect(resolveRoleAbilityAlias("手枪", COC_ABILITY_ALIASES)).toBe("手枪");
    expect(resolveRoleAbilityAlias("  ")).toBe("");
  });
});
