import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import executorCoc from "./cmdExeCoc";

describe("coc7 骰子指令", () => {
  let cpi: CPI;

  beforeEach(() => {
    cpi = {
      replyMessage: vi.fn<(...args: any[]) => any>(),
      sendToast: vi.fn<(...args: any[]) => any>(),
      getRoleAbilityList: vi.fn<(...args: any[]) => any>().mockReturnValue({
        skill: {
          手枪: "80",
        },
      }),
      getSpaceInfo: vi.fn<(...args: any[]) => any>(),
      getSpaceData: vi.fn<(...args: any[]) => any>().mockReturnValue("0"),
      setRoleAbilityList: vi.fn<(...args: any[]) => any>(),
      setCopywritingKey: vi.fn<(...args: any[]) => any>(),
    } as unknown as CPI;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rc 支持紧贴技能名的 3# 多次检定并合并回复", async () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.7)
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.4)
      .mockReturnValueOnce(0);

    const result = await executorCoc.execute("rc", ["3#手枪"], [{ roleId: 1, roleName: "卑微小周" }] as any, cpi);

    expect(result).toBe(true);
    expect(cpi.replyMessage).toHaveBeenCalledWith([
      `对<卑微小周>的"手枪"进行了3次检定，结果为:`,
      "D100=79/80 成功",
      "D100=10/80 极难成功",
      "D100=40/80 困难成功",
    ].join("\n"));
  });

  it("rap 支持独立 3# 参数并复用惩罚骰逻辑", async () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.4)
      .mockReturnValueOnce(0.8)
      .mockReturnValueOnce(0.3)
      .mockReturnValueOnce(0.4)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.6)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.6);

    const result = await executorCoc.execute("rap", ["3#", "手枪"], [{ roleId: 1, roleName: "卑微小周" }] as any, cpi);

    expect(result).toBe(true);
    expect(cpi.replyMessage).toHaveBeenCalledWith([
      `对<卑微小周>的"手枪"进行了3次检定，结果为:`,
      "D100=48/80 成功 惩罚骰 [4,3]",
      "D100=65/80 成功 惩罚骰 [4,6]",
      "D100=65/80 成功 惩罚骰 [5,6]",
    ].join("\n"));
  });

  it("多次检定超过上限时提示错误", async () => {
    const result = await executorCoc.execute("rc", ["21#手枪"], [{ roleId: 1, roleName: "卑微小周" }] as any, cpi);

    expect(result).toBe(false);
    expect(cpi.replyMessage).toHaveBeenCalledWith("错误：一次最多支持20次检定");
  });
});
