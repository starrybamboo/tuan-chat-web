import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import UTILS from "@/components/common/dicer/utils/utils";

import executorPublic from "./cmdExePublic";

vi.mock("@/components/common/dicer/utils/utils", async () => {
  const actual = await vi.importActual<typeof import("@/components/common/dicer/utils/utils")>("@/components/common/dicer/utils/utils");
  return {
    default: {
      ...actual.default,
      getRoleAbilityValue: vi.fn<(...args: any[]) => any>(),
    },
  };
});

describe("通用骰子指令", () => {
  let cpi: CPI;

  beforeEach(() => {
    cpi = {
      replyMessage: vi.fn<(...args: any[]) => any>(),
      sendToast: vi.fn<(...args: any[]) => any>(),
      getRoleAbilityList: vi.fn<(...args: any[]) => any>(),
      getSpaceInfo: vi.fn<(...args: any[]) => any>(),
      getSpaceData: vi.fn<(...args: any[]) => any>(),
      setRoleAbilityList: vi.fn<(...args: any[]) => any>(),
      setCopywritingKey: vi.fn<(...args: any[]) => any>(),
    } as unknown as CPI;

    (UTILS.getRoleAbilityValue as any).mockImplementation((ability: any, key: string) => {
      return ability?.basic?.[key] ?? ability?.ability?.[key] ?? ability?.skill?.[key];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rd 无参数时固定按 1d100 掷骰", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.12);
    (cpi.getSpaceData as any).mockReturnValue("20");

    const executor = executorPublic.cmdMap.get("rd");
    await executor?.solve([], [], cpi);

    expect(cpi.replyMessage).toHaveBeenCalledWith("掷骰结果：1d100 = 1d100[13] = 13");
  });

  it("rd 带面数参数时按 1d{面数} 掷骰", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const executor = executorPublic.cmdMap.get("rd");
    await executor?.solve(["20"], [], cpi);

    expect(cpi.replyMessage).toHaveBeenCalledWith("掷骰结果：1d20 = 1d20[11] = 11");
  });

  it("ri 读取单个角色的敏捷作为先攻", async () => {
    const ability = {
      basic: { 敏捷: "65" },
      skill: {},
    };
    (cpi.getRoleAbilityList as any).mockResolvedValue(ability);

    const executor = executorPublic.cmdMap.get("ri");
    await executor?.solve([], [{ roleId: 1, roleName: "调查员" } as any], cpi);

    expect(cpi.replyMessage).not.toHaveBeenCalled();
    expect(cpi.setRoleAbilityList).toHaveBeenCalledWith(1, {
      basic: { 敏捷: "65" },
      skill: { initiative: "65" },
    });
  });

  it("ri 支持多个角色统一读取敏捷并汇总", async () => {
    (cpi.getRoleAbilityList as any).mockImplementation(async (roleId: number) => {
      return roleId === 2
        ? { basic: { 敏捷: "40" } }
        : { basic: { 敏捷: "65" } };
    });

    const executor = executorPublic.cmdMap.get("ri");
    await executor?.solve([], [
      { roleId: 1, roleName: "调查员" },
      { roleId: 2, roleName: "助手" },
    ] as any, cpi);

    expect(cpi.replyMessage).not.toHaveBeenCalled();
    expect(cpi.setRoleAbilityList).toHaveBeenCalledTimes(2);
    expect(cpi.setRoleAbilityList).toHaveBeenNthCalledWith(1, 1, {
      basic: { 敏捷: "65" },
      skill: { initiative: "65" },
    });
    expect(cpi.setRoleAbilityList).toHaveBeenNthCalledWith(2, 2, {
      basic: { 敏捷: "40" },
      skill: { initiative: "40" },
    });
  });

  it("ri 没有角色时提示未指定角色", async () => {
    const executor = executorPublic.cmdMap.get("ri");
    await executor?.solve([], [], cpi);

    expect(cpi.sendToast).toHaveBeenCalledWith("未指定角色");
    expect(cpi.replyMessage).not.toHaveBeenCalled();
  });
});
