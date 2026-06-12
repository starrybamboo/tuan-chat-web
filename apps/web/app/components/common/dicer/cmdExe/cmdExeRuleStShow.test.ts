import { beforeEach, describe, expect, it, vi } from "vitest";

import executorCoc from "./cmdExeCoc";
import executorFu from "./cmdExeFu";

const { executeStShowCommandMock } = vi.hoisted(() => ({
  executeStShowCommandMock: vi.fn<(...args: any[]) => any>(),
}));

vi.mock("./cmdExePublic", async () => {
  const actual = await vi.importActual<typeof import("./cmdExePublic")>("./cmdExePublic");
  return {
    ...actual,
    executeStShowCommand: executeStShowCommandMock,
  };
});

describe("规则 st show 委托", () => {
  let cpi: CPI;

  beforeEach(() => {
    executeStShowCommandMock.mockReset();
    executeStShowCommandMock.mockResolvedValue(true);
    cpi = {
      replyMessage: vi.fn<(...args: any[]) => any>(),
      sendToast: vi.fn<(...args: any[]) => any>(),
      getRoleAbilityList: vi.fn<(...args: any[]) => any>(),
      getSpaceInfo: vi.fn<(...args: any[]) => any>(),
      getSpaceData: vi.fn<(...args: any[]) => any>(),
      setRoleAbilityList: vi.fn<(...args: any[]) => any>(),
      setCopywritingKey: vi.fn<(...args: any[]) => any>(),
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

  it("fU 的 .st 支持把掷骰表达式按 FU 别名写入 skill", async () => {
    const role = {
      roleId: 1,
      roleName: "维洛",
      userId: 1,
      type: 0,
    } as UserRole;
    const ability = {
      skill: {},
    };
    (cpi.getRoleAbilityList as any).mockReturnValue(ability);

    const result = await executorFu.cmdMap.get("st")?.solve(["dex", "1d4+1d8"], [role], cpi);

    expect(result).toBe(true);
    expect(cpi.setRoleAbilityList).toHaveBeenCalledWith(1, {
      skill: {
        敏捷: "1d4+1d8",
      },
    });
    expect(cpi.replyMessage).toHaveBeenCalledWith("掷骰表达式设置成功：维洛的敏捷 = 1d4+1d8");
  });
});
