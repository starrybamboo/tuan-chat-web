import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import executorPublic from "./cmdExePublic";

describe("通用骰子指令", () => {
  let cpi: CPI;

  beforeEach(() => {
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
});
