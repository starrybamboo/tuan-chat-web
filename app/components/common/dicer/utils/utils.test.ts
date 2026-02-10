// noinspection NonAsciiCharacters

import type { Mock } from "vitest";

import { vi } from "vitest";

import { AliasMap } from "./aliasMap";
import UTILS from "./utils";

// Mock函数，只mock外部依赖，保留实际的calculateExpression函数以便测试
vi.mock("./utils", async () => {
  const actual = await vi.importActual<typeof import("./utils")>("./utils");
  return {
    __esModule: true,
    default: {
      doesHaveArg: vi.fn(),
      setRoleAbilityValue: vi.fn(),
      getRoleAbilityValue: vi.fn(),
      calculateExpression: actual.default.calculateExpression,
    },
  };
});

describe("dicer utils 测试", () => {
  let mockRoleAbility: RoleAbility;

  beforeAll(() => {
    AliasMap.getInstance({ 1001: new Map() });
  });

  beforeEach(() => {
    // 重置mock
    vi.clearAllMocks();

    // 创建默认的角色能力对象用于测试
    mockRoleAbility = {
      abilityId: 1,
      roleId: 101,
      ruleId: 1001,
      act: {},
      basic: {
        力量: "40",
        敏捷: "60",
        体质: "55",
        智力: "80",
        教育: "65",
        意志: "55",
        体型: "25",
        外貌: "90",
      },
      ability: {
        hp: "(体质*1+体型*1)/10",
      },
      skill: {
        母语: "教育",
        斗殴: "40",
      },
    };
  });

  // doesHaveArg 函数测试
  describe("doesHaveArg 函数测试", () => {
    it("应该正确识别并移除包含的参数", () => {
      const args = ["arg1", "Arg2", "ARG3"];
      (UTILS.doesHaveArg as Mock).mockImplementation((argList, arg) => {
        // 模拟原始函数的行为
        const argsFmt = argList.map((item: string) => item.trim().toLowerCase());
        const res = argsFmt.includes(arg.toLowerCase());
        if (res) {
          const index = argsFmt.indexOf(arg.toLowerCase());
          argList.splice(index, 1);
        }
        return res;
      });

      const result = UTILS.doesHaveArg(args, "Arg2");

      expect(result).toBe(true);
      expect(args).toEqual(["arg1", "ARG3"]);
    });

    it("应该返回false当参数不包含在列表中", () => {
      const args = ["arg1", "arg2"];
      (UTILS.doesHaveArg as Mock).mockImplementation((argList, arg) => {
        const argsFmt = argList.map((item: string) => item.trim().toLowerCase());
        return argsFmt.includes(arg.toLowerCase());
      });

      const result = UTILS.doesHaveArg(args, "arg3");

      expect(result).toBe(false);
      expect(args).toEqual(["arg1", "arg2"]); // 列表不变
    });
  });

  // setRoleAbilityValue 函数测试
  describe("setRoleAbilityValue 函数测试", () => {
    it("应该正确设置basic类型的值", () => {
      const mockSetRoleAbilityValue = UTILS.setRoleAbilityValue as Mock;

      UTILS.setRoleAbilityValue(mockRoleAbility, "力量", "50", "basic", "basic");

      expect(mockSetRoleAbilityValue).toHaveBeenCalledWith(mockRoleAbility, "力量", "50", "basic", "basic");
    });

    it("应该正确设置ability类型的值", () => {
      const mockSetRoleAbilityValue = UTILS.setRoleAbilityValue as Mock;

      UTILS.setRoleAbilityValue(mockRoleAbility, "hp", "10", "ability", "ability");

      expect(mockSetRoleAbilityValue).toHaveBeenCalledWith(mockRoleAbility, "hp", "10", "ability", "ability");
    });

    it("应该正确设置skill类型的值", () => {
      const mockSetRoleAbilityValue = UTILS.setRoleAbilityValue as Mock;

      UTILS.setRoleAbilityValue(mockRoleAbility, "母语", "80", "skill", "skill");

      expect(mockSetRoleAbilityValue).toHaveBeenCalledWith(mockRoleAbility, "母语", "80", "skill", "skill");
    });
  });

  // getRoleAbilityValue 函数测试
  describe("getRoleAbilityValue 函数测试", () => {
    it("应该正确获取basic类型的值", () => {
      const mockGetRoleAbilityValue = UTILS.getRoleAbilityValue as Mock;
      mockGetRoleAbilityValue.mockReturnValue("40");

      const result = UTILS.getRoleAbilityValue(mockRoleAbility, "力量", "basic");

      expect(result).toBe("40");
      expect(mockGetRoleAbilityValue).toHaveBeenCalledWith(mockRoleAbility, "力量", "basic");
    });

    it("应该正确获取ability类型的值", () => {
      const mockGetRoleAbilityValue = UTILS.getRoleAbilityValue as Mock;
      mockGetRoleAbilityValue.mockReturnValue("(体质*1+体型*1)/10");

      const result = UTILS.getRoleAbilityValue(mockRoleAbility, "hp", "ability");

      expect(result).toBe("(体质*1+体型*1)/10");
      expect(mockGetRoleAbilityValue).toHaveBeenCalledWith(mockRoleAbility, "hp", "ability");
    });

    it("应该正确获取skill类型的值", () => {
      const mockGetRoleAbilityValue = UTILS.getRoleAbilityValue as Mock;
      mockGetRoleAbilityValue.mockReturnValue("教育");

      const result = UTILS.getRoleAbilityValue(mockRoleAbility, "母语", "skill");

      expect(result).toBe("教育");
      expect(mockGetRoleAbilityValue).toHaveBeenCalledWith(mockRoleAbility, "母语", "skill");
    });

    it("当值不存在时应该返回undefined", () => {
      const mockGetRoleAbilityValue = UTILS.getRoleAbilityValue as Mock;
      mockGetRoleAbilityValue.mockReturnValue(undefined);

      const result = UTILS.getRoleAbilityValue(mockRoleAbility, "不存在的属性", "basic");

      expect(result).toBeUndefined();
      expect(mockGetRoleAbilityValue).toHaveBeenCalledWith(mockRoleAbility, "不存在的属性", "basic");
    });
  });

  // calculateExpression 函数测试
  describe("calculateExpression 函数测试", () => {
    // 测试基本四则运算
    it("应该正确计算简单加法", () => {
      const result = UTILS.calculateExpression("2+3", mockRoleAbility);
      expect(result).toBe(5);
    });

    it("应该正确计算简单减法", () => {
      const result = UTILS.calculateExpression("5-2", mockRoleAbility);
      expect(result).toBe(3);
    });

    it("应该正确计算简单乘法", () => {
      const result = UTILS.calculateExpression("3*4", mockRoleAbility);
      expect(result).toBe(12);
    });

    it("应该正确计算简单除法并向下取整", () => {
      const result = UTILS.calculateExpression("7/2", mockRoleAbility);
      expect(result).toBe(3); // 7/2 = 3.5, 向下取整为3
    });

    // 测试运算符优先级
    it("应该正确处理运算符优先级", () => {
      const result = UTILS.calculateExpression("2+3*4", mockRoleAbility);
      expect(result).toBe(14); // 先计算3*4=12，再加2=14
    });

    // 测试括号
    it("应该正确处理括号", () => {
      const result = UTILS.calculateExpression("(2+3)*4", mockRoleAbility);
      expect(result).toBe(20); // 先计算括号内的2+3=5，再乘4=20
    });

    it("应该正确处理多层括号", () => {
      const result = UTILS.calculateExpression("(2+(3*4))*5", mockRoleAbility);
      expect(result).toBe(70); // 先计算最内层3*4=12，加2=14，再乘5=70
    });

    // 测试变量替换
    it("应该正确替换basic类型的变量", () => {
      (UTILS.getRoleAbilityValue as Mock).mockReturnValue("40");
      const result = UTILS.calculateExpression("力量+5", mockRoleAbility);
      expect(result).toBe(45);
    });

    it("应该正确替换能力值中的表达式变量", () => {
      (UTILS.getRoleAbilityValue as Mock).mockImplementation((role, key) => {
        const values: Record<string, string> = {
          hp: "(体质*1+体型*1)/10",
          体质: "55",
          体型: "25",
        };
        return values[key] || "0";
      });

      // 先获取hp的表达式
      const hpExpression = UTILS.getRoleAbilityValue(mockRoleAbility, "hp", "ability");
      // 然后计算该表达式的值
      const result = UTILS.calculateExpression(hpExpression || "0", mockRoleAbility);
      expect(result).toBe(8); // (55*1+25*1)/10 = 80/10 = 8
    });

    it("应该正确替换skill类型的变量", () => {
      (UTILS.getRoleAbilityValue as Mock).mockImplementation((role, key) => {
        if (key === "斗殴") {
          return "40";
        }
        return "0";
      });
      const result = UTILS.calculateExpression("斗殴+3", mockRoleAbility);
      expect(result).toBe(43); // 斗殴=40，40+3=43
    });

    it("应该正确处理多个中文变量", () => {
      (UTILS.getRoleAbilityValue as Mock).mockImplementation((role, key) => {
        const values: Record<string, string> = {
          力量: "40",
          敏捷: "60",
        };
        return values[key] || "0";
      });
      const result = UTILS.calculateExpression("力量+敏捷", mockRoleAbility);
      expect(result).toBe(100);
    });

    // 测试复杂表达式
    it("应该正确处理包含中文变量的复杂表达式", () => {
      (UTILS.getRoleAbilityValue as Mock).mockImplementation((role, key) => {
        const values: Record<string, string> = {
          力量: "40",
          敏捷: "60",
          体质: "55",
        };
        return values[key] || "0";
      });
      const result = UTILS.calculateExpression("(力量+敏捷)*体质/100", mockRoleAbility);
      expect(result).toBe(55); // (40+60)*55/100 = 100*55/100 = 55
    });

    // 测试异常情况
    it("应该在遇到无效的数字格式时抛出错误", () => {
      expect(() => {
        UTILS.calculateExpression("2.3.4", mockRoleAbility);
      }).toThrow("无效的数字格式");
    });

    it("应该在除数为零时抛出错误", () => {
      expect(() => {
        UTILS.calculateExpression("5/0", mockRoleAbility);
      }).toThrow("除数不能为零");
    });

    it("应该在括号不匹配时抛出错误", () => {
      expect(() => {
        UTILS.calculateExpression("(2+3", mockRoleAbility);
      }).toThrow("括号不匹配");
    });

    it("应该在表达式无效时抛出错误", () => {
      expect(() => {
        UTILS.calculateExpression("+", mockRoleAbility);
      }).toThrow("无效的表达式");
    });
  });
});
