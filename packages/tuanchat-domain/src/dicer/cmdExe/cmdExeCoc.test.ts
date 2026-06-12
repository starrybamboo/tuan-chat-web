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
});
