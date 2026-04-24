import { beforeEach, describe, expect, it, vi } from "vitest";

const { executeStShowCommandMock } = vi.hoisted(() => ({
  executeStShowCommandMock: vi.fn(),
}));

vi.mock("./cmdExePublic", async () => {
  const actual = await vi.importActual<typeof import("./cmdExePublic")>("./cmdExePublic");
  return {
    ...actual,
    executeStShowCommand: executeStShowCommandMock,
  };
});

import executorCoc from "./cmdExeCoc";
import executorFu from "./cmdExeFu";

describe("规则 st show 委托", () => {
  let cpi: CPI;

  beforeEach(() => {
    executeStShowCommandMock.mockReset();
    executeStShowCommandMock.mockResolvedValue(true);
    cpi = {
      replyMessage: vi.fn(),
      sendToast: vi.fn(),
      getRoleAbilityList: vi.fn(),
      getSpaceInfo: vi.fn(),
      getSpaceData: vi.fn(),
      setRoleAbilityList: vi.fn(),
      setCopywritingKey: vi.fn(),
    } as unknown as CPI;
  });

  it.each([
    ["COC", executorCoc],
    ["FU", executorFu],
  ])("%s 的 .st show 会走公共 helper", async (_ruleName, executor) => {
    const role = {
      roleId: 1,
      roleName: "维洛",
      userId: 1,
      type: 0,
    } as UserRole;

    const result = await executor.cmdMap.get("st")?.solve(["show", "图书馆"], [role], cpi);

    expect(result).toBe(true);
    expect(executeStShowCommandMock).toHaveBeenCalledWith(["show", "图书馆"], role, cpi);
  });
});
