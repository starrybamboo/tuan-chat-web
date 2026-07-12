import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CPI } from "../types";

import executorCoc from "./cmdExeCoc";

type MockFn = (...args: any[]) => any;

describe("domain coc7 骰子指令", () => {
  let cpi: CPI;

  beforeEach(() => {
    cpi = {
      replyMessage: vi.fn<MockFn>(),
      sendToast: vi.fn<MockFn>(),
      getRoleAbilityList: vi.fn<MockFn>().mockReturnValue({
        skill: {
          教育: "60",
          手枪: "80",
        },
      }),
      getSpaceInfo: vi.fn<MockFn>(),
      getSpaceData: vi.fn<MockFn>().mockReturnValue("0"),
      setRoleAbilityList: vi.fn<MockFn>(),
      setCopywritingKey: vi.fn<MockFn>(),
      setSpaceData: vi.fn<MockFn>(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rc 支持 3# 多次检定并合并回复", async () => {
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

  it("en 支持英文属性别名", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.49);

    const result = await executorCoc.execute("en", ["edu"], [{ roleId: 1, roleName: "卑微小周" }] as any, cpi);

    expect(result).toBe(true);
    expect(cpi.replyMessage).toHaveBeenCalledWith("教育成长检定：D100=50/60，检定成功，无法成长");
  });

  it("en 支持属性名和值的紧凑写法", async () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.89)
      .mockReturnValueOnce(0);

    const result = await executorCoc.execute("en", ["教育80"], [{ roleId: 1, roleName: "卑微小周" }] as any, cpi);

    expect(result).toBe(true);
    expect(cpi.setRoleAbilityList).toHaveBeenCalledWith(1, expect.objectContaining({
      skill: expect.objectContaining({ 教育: "81" }),
    }));
    expect(cpi.replyMessage).toHaveBeenCalledWith([
      "教育成长检定：D100=90/80，检定失败",
      "教育成长：80 -> 81",
    ].join("\n"));
  });

  it("en 缺少属性名时返回可读错误", async () => {
    const result = await executorCoc.execute("en", ["80"], [{ roleId: 1, roleName: "卑微小周" }] as any, cpi);

    expect(result).toBe(false);
    expect(cpi.replyMessage).toHaveBeenCalledWith("错误：缺少技能名称");
  });
});
