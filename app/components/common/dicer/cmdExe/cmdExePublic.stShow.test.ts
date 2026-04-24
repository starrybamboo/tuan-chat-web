import { beforeEach, describe, expect, it, vi } from "vitest";

const { openStShowCardWindowMock } = vi.hoisted(() => ({
  openStShowCardWindowMock: vi.fn(),
}));

vi.mock("./stShowCard", () => ({
  openStShowCardWindow: openStShowCardWindowMock,
}));

import executorPublic from "./cmdExePublic";

describe("通用 st show 指令", () => {
  let cpi: CPI;

  beforeEach(() => {
    openStShowCardWindowMock.mockReset();
    openStShowCardWindowMock.mockResolvedValue(undefined);
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
    expect(openStShowCardWindowMock).toHaveBeenCalledWith({
      ability: expect.objectContaining({
        basic: { 力量: "60" },
        ability: { hp: "5", hpm: "10" },
        ruleId: 1,
      }),
      roleName: "维洛",
      requestedKeys: [],
    });
    expect(cpi.sendToast).not.toHaveBeenCalled();
  });
});
