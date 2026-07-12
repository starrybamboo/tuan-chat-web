import { beforeEach, describe, expect, it, vi } from "vitest";

import executorPublic from "./cmdExePublic";

describe("通用 st show 指令", () => {
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
      showRoleAbilityCard: vi.fn<(...args: any[]) => any>(),
    } as unknown as CPI;
  });

  it("无参数时会打开整卡展示窗口", async () => {
    (cpi.getRoleAbilityList as any).mockReturnValue({
      basic: {
        力量: "60",
      },
      ability: {
        hp: "5",
        hpm: "10",
      },
      ruleId: 1,
    });

    const executor = executorPublic.cmdMap.get("st");
    const result = await executor?.solve(["show"], [{
      roleId: 1,
      roleName: "维洛",
      userId: 1,
      type: 0,
    } as UserRole], cpi);

    expect(result).toBe(true);
    expect(cpi.showRoleAbilityCard).toHaveBeenCalledWith({
      ability: expect.objectContaining({
        basic: { 力量: "60" },
        ability: { hp: "5", hpm: "10" },
        ruleId: 1,
      }),
      roleName: "维洛",
      requestedKeys: [],
    });
    expect(cpi.sendToast).not.toHaveBeenCalled();
    expect(cpi.replyMessage).not.toHaveBeenCalled();
  });
});
