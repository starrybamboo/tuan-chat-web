// noinspection NonAsciiCharacters

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RoleAbility } from "@tuanchat/openapi-client/models/RoleAbility";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import UTILS from "@/components/common/dicer/utils/utils";

import executorDnd from "./cmdExeDnd";

// Mock UTILS
vi.mock("@/components/common/dicer/utils/utils", async () => {
  const actual = await vi.importActual<typeof import("@/components/common/dicer/utils/utils")>("@/components/common/dicer/utils/utils");
  return {
    default: {
      ...actual.default,
      getRoleAbilityValue: vi.fn(),
      calculateExpression: vi.fn(),
    },
  };
});

describe("d&D 5e 指令集测试", () => {
  let cpi: CPI;
  let mockRole: UserRole;
  let mockAbility: RoleAbility;

  beforeEach(() => {
    // 模拟 CPI 对象
    cpi = {
      replyMessage: vi.fn(),
      sendToast: vi.fn(),
      getRoleAbilityList: vi.fn(),
      getSpaceInfo: vi.fn(),
      setRoleAbilityList: vi.fn(),
      setCopywritingKey: vi.fn(),
    } as unknown as CPI;

    // 默认角色
    mockRole = {
      userId: 1,
      roleId: 101,
      roleName: "测试角色",
      type: 0,
    };

    // 默认能力数据
    mockAbility = {
      roleId: 101,
      basic: {}, // 属性
      skill: {}, // 技能
      ability: {}, // 能力
    };

    (cpi.getRoleAbilityList as any).mockResolvedValue(mockAbility);

    // 模拟 getRoleAbilityValue 行为
    (UTILS.getRoleAbilityValue as any).mockImplementation((role: RoleAbility, key: string, type: string) => {
      // 简单模拟获取逻辑
      if (type === "basic") {
        return role.basic?.[key];
      }
      if (type === "skill") {
        return role.skill?.[key];
      }
      if (type === "ability") {
        return role.ability?.[key];
      }
      // auto
      return role.basic?.[key] || role.skill?.[key] || role.ability?.[key];
    });

    // 模拟 calculateExpression 行为 (简单 eval)
    (UTILS.calculateExpression as any).mockImplementation((expr: string) => {
      // 移除所有非数字和运算符，防止 unsafe eval，虽然仅测试用
      // 简单处理：仅支持加减数字
      if (!expr) {
        return Number.NaN;
      }
      try {
        // eslint-disable-next-line no-eval
        return eval(expr);
      }
      catch {
        return Number.NaN;
      }
    });

    // 固定随机数，让 1d20 结果为 11
    // Math.random() * 20 + 1 -> 0.5 * 20 + 1 = 11
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("ra (属性/技能检定)", () => {
    it("应该正确进行属性检定 (Attribute Check)", async () => {
      // 力量 16 -> 调整值 floor((16-10)/2) = 3
      mockAbility.basic = { 力量: "16" };

      const executor = executorDnd.cmdMap.get("ra");
      expect(executor).toBeDefined();

      await executor?.solve(["力量"], [mockRole], cpi);

      // 预期：1d20(11) + 力量调整值(+3) = 14
      expect(cpi.replyMessage).toHaveBeenCalledWith(
        expect.stringContaining("测试角色 进行了 力量检定: 1d20(11) + 力量调整值(+3) = 14"),
      );
    });

    it("应该正确进行技能检定 (Skill Check)", async () => {
      // 运动 +5
      mockAbility.skill = { 运动: "5" };

      const executor = executorDnd.cmdMap.get("ra");
      await executor?.solve(["运动"], [mockRole], cpi);

      // 预期：1d20(11) + 运动(+5) = 16
      expect(cpi.replyMessage).toHaveBeenCalledWith(
        expect.stringContaining("测试角色 进行了 运动检定: 1d20(11) + 运动(+5) = 16"),
      );
    });

    it("应该处理负值调整值", async () => {
      // 敏捷 8 -> 调整值 -1
      mockAbility.basic = { 敏捷: "8" };

      const executor = executorDnd.cmdMap.get("ra");
      await executor?.solve(["敏捷"], [mockRole], cpi);

      // 预期：1d20(11) + 敏捷调整值(-1) = 10
      expect(cpi.replyMessage).toHaveBeenCalledWith(
        expect.stringContaining("测试角色 进行了 敏捷检定: 1d20(11) + 敏捷调整值(-1) = 10"),
      );
    });

    it("应该支持额外加值参数", async () => {
      mockAbility.basic = { 力量: "16" }; // +3

      const executor = executorDnd.cmdMap.get("ra");
      // .ra 力量 +2
      await executor?.solve(["力量", "+2"], [mockRole], cpi);

      // 11 + 3 + 2 = 16
      // 输出可能类似: ... + 力量调整值(+3) +2 = 16
      expect(cpi.replyMessage).toHaveBeenCalledWith(
        expect.stringContaining("= 16"),
      );
      expect(cpi.replyMessage).toHaveBeenCalledWith(
        expect.stringContaining("+2"),
      );
    });

    it("应该支持未定义的技能名", async () => {
      const executor = executorDnd.cmdMap.get("ra");
      await executor?.solve(["不存在的技能"], [mockRole], cpi);

      // 11 + 0 = 11
      expect(cpi.replyMessage).toHaveBeenCalledWith(
        expect.stringContaining("测试角色 进行了 不存在的技能检定"),
      );
    });
  });

  describe("rs (豁免检定)", () => {
    it("应该正确进行豁免检定", async () => {
      // 体质 14 -> +2
      mockAbility.basic = { 体质: "14" };

      const executor = executorDnd.cmdMap.get("rs");
      await executor?.solve(["体质"], [mockRole], cpi);

      // 1d20(11) + 2 = 13
      expect(cpi.replyMessage).toHaveBeenCalledWith(
        expect.stringContaining("测试角色 进行了 体质豁免: 1d20(11) + 体质调整值(+2) = 13"),
      );
    });
  });

  describe("ri (先攻)", () => {
    it("应该优先使用预设先攻值 (Initiative Property)", async () => {
      // 设定先攻值为 5 (来自 skill 或 ability)
      mockAbility.skill = { 先攻: "5" };
      mockAbility.basic = { 敏捷: "10" }; // 敏捷+0，如果有冲突应优先 skill

      const executor = executorDnd.cmdMap.get("ri");
      await executor?.solve([], [mockRole], cpi);

      // 1d20(11) + 5 = 16
      expect(cpi.replyMessage).toHaveBeenCalledWith(
        expect.stringContaining("测试角色 投掷先攻: 1d20(11) + 先攻(5) = 16"),
      );
    });

    it("如果没有预设先攻值，应该使用敏捷调整值", async () => {
      // 敏捷 16 -> +3
      mockAbility.basic = { 敏捷: "16" };

      const executor = executorDnd.cmdMap.get("ri");
      await executor?.solve([], [mockRole], cpi);

      // 1d20(11) + 3 = 14
      expect(cpi.replyMessage).toHaveBeenCalledWith(
        expect.stringContaining("测试角色 投掷先攻: 1d20(11) + 敏捷调整值(3) = 14"),
      );
    });
  });

  describe("rab (优势检定)", () => {
    it("应该取两次投掷中的高值", async () => {
      mockAbility.basic = { 力量: "10" }; // +0

      // 模拟两次投掷: 第一次 0.1(3), 第二次 0.8(17)
      // rollD20 内部调用两次 Math.random
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.1) // -> 3
        .mockReturnValueOnce(0.8); // -> 17

      const executor = executorDnd.cmdMap.get("rab");
      await executor?.solve(["力量"], [mockRole], cpi);

      // 结果应为 17
      expect(cpi.replyMessage).toHaveBeenCalledWith(
        expect.stringContaining("2d20kh1(3, 17 -> 17)"),
      );
      expect(cpi.replyMessage).toHaveBeenCalledWith(
        expect.stringContaining("= 17"),
      );
    });
  });

  describe("rap (劣势检定)", () => {
    it("应该取两次投掷中的低值", async () => {
      mockAbility.basic = { 力量: "10" }; // +0

      // 模拟两次投掷: 第一次 0.8(17), 第二次 0.1(3)
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.8) // -> 17
        .mockReturnValueOnce(0.1); // -> 3

      const executor = executorDnd.cmdMap.get("rap");
      await executor?.solve(["力量"], [mockRole], cpi);

      // 结果应为 3
      expect(cpi.replyMessage).toHaveBeenCalledWith(
        expect.stringContaining("2d20kl1(17, 3 -> 3)"),
      );
      expect(cpi.replyMessage).toHaveBeenCalledWith(
        expect.stringContaining("= 3"),
      );
    });
  });

  describe("ds (死亡豁免)", () => {
    it("应该正确处理大成功 (20)", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0.99); // 20
      const executor = executorDnd.cmdMap.get("ds");
      await executor?.solve([], [mockRole], cpi);

      expect(cpi.replyMessage).toHaveBeenCalledWith(
        expect.stringContaining("大成功 (回复1点HP)"),
      );
    });

    it("应该正确处理大失败 (1)", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0.0); // 1
      const executor = executorDnd.cmdMap.get("ds");
      await executor?.solve([], [mockRole], cpi);

      expect(cpi.replyMessage).toHaveBeenCalledWith(
        expect.stringContaining("大失败 (计2次失败)"),
      );
    });

    it("应该正确处理普通成功 (>=10)", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0.45); // 10
      const executor = executorDnd.cmdMap.get("ds");
      await executor?.solve([], [mockRole], cpi);

      expect(cpi.replyMessage).toHaveBeenCalledWith(
        expect.stringMatching(/成功$/), // 以成功结尾，且不是大成功
      );
    });

    it("应该正确处理普通失败 (<10)", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0.4); // 9
      const executor = executorDnd.cmdMap.get("ds");
      await executor?.solve([], [mockRole], cpi);

      expect(cpi.replyMessage).toHaveBeenCalledWith(
        expect.stringMatching(/失败$/), // 以失败结尾，且不是大失败
      );
    });
  });
});
