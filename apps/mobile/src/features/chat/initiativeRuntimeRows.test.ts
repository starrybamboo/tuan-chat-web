import { describe, expect, it } from "vitest";

import { buildMobileInitiativeRows } from "./initiativeRuntimeRows";

describe("buildMobileInitiativeRows", () => {
  it("participant 事件移除后不再从 runtime participants 派生先攻行", () => {
    expect(buildMobileInitiativeRows([])).toEqual([]);
  });
});
