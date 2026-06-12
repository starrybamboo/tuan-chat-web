import { describe, expect, it } from "vitest";

import { COC_ABILITY_ALIASES, createRoleAbilityAliasMapSet } from "./roleAbilityAliasMaps";

describe("roleAbilityAliasMaps", () => {
  it("COC 别名表将巧手归一到妙手", () => {
    expect(COC_ABILITY_ALIASES.巧手).toBe("妙手");
    expect(createRoleAbilityAliasMapSet()[1].get("巧手")).toBe("妙手");
  });
});
