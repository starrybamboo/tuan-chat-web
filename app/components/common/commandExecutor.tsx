import { useEffect, useRef } from "react";
import {
  useGetRoleAbilitiesQuery,
  useSetRoleAbilityMutation,
  useUpdateRoleAbilityMutation,
} from "../../../api/hooks/abilityQueryHooks";
// type DiceResult = { x: number; y: number; rolls: number[]; total: number };

// 属性名中英文对照表
const ABILITY_MAP: { [key: string]: string } = {
  str: "力量",
  dex: "敏捷",
  pow: "意志",
  con: "体质",
  app: "外貌",
  edu: "教育",
  siz: "体型",
  int: "智力",
  san: "san值",
  luck: "幸运",
  mp: "魔法",
  hp: "体力",
  cm: "克苏鲁神话",
};

export function isCommand(command: string) {
  const trimmed = command.trim();
  return (trimmed.startsWith(".") || trimmed.startsWith("。"));
}

export default function useCommandExecutor(roleId: number) {
  const defaultDice = useRef(100);

  const abilityQuery = useGetRoleAbilitiesQuery(roleId);
  const abilityIds = abilityQuery.data?.data?.map(a => a.abilityId) ?? [];

  const updateAbilityMutation = useUpdateRoleAbilityMutation();
  const setAbilityMutation = useSetRoleAbilityMutation();

  useEffect(() => {
    try {
      defaultDice.current = Number(localStorage.getItem("defaultDice")) ?? 100;
    }
    catch (e) {
      console.error(e);
    }
  }, []);
  // 合并所有的ability
  const attributes = abilityQuery.data?.data?.reduce((acc, cur) => {
    if (cur?.ability) {
      return { ...acc, ...cur.ability };
    }
    return acc;
  }, {} as Record<string, number>) ?? {};

  /**
   * 返回这个函数
   * @param command
   */
  function execute(command: string): string {
    const [cmdPart, ...args] = parseCommand(command);
    try {
      switch (cmdPart) {
        case "r": return handleRoll(args);
        case "set": return handleSet(args);
        case "st": return handleSt(args);
        case "rc": return handleRc(args);
        case "sc": return handleSc(args);
        case "en": return handleEn(args);
        case "ti":
        case "li": return "疯狂症状功能暂未实现";
        default: return `未知命令 ${cmdPart}`;
      }
    }
    catch (e) {
      return `执行错误：${e instanceof Error ? e.message : String(e)}`;
    }
  }

  /**
   *解析骰子表达式
   * @const
   */
  function parseCommand(input: string): [string, ...string[]] {
    const trimmed = input.trim().slice(1);
    // 匹配所有的英文字符，取第一个为命令
    const cmdMatch = trimmed.match(/^([A-Z]+)/i);
    const cmdPart = cmdMatch?.[0] ?? "";
    const args = trimmed.slice(cmdPart.length).trim().split(/\s+/);
    const wholeArg = args.join("");
    return [cmdPart.toLowerCase(), wholeArg];
  }

  function parseDices(input: string): Array<{ sign: number; x: number; y: number }> {
    // 处理空输入使用默认骰子
    if (input.trim() === "") {
      if (!defaultDice)
        throw new Error("未设置默认骰子");
      return [{ sign: 1, x: 1, y: defaultDice.current }];
    }
    // 使用正则拆分带符号的表达式
    const segments = input.split(/(?=[+-])/g);
    const parsedSegments = [];
    for (const segment of segments) {
      let sign = 1;
      let diceExpr = segment;
      // 解析符号
      if (diceExpr.startsWith("+")) {
        diceExpr = diceExpr.slice(1);
      }
      else if (diceExpr.startsWith("-")) {
        sign = -1;
        diceExpr = diceExpr.slice(1);
      }
      // 解析单个骰子
      const { x, y } = parseSingleDice(diceExpr);
      parsedSegments.push({ sign, x, y });
    }
    return parsedSegments;
  }

  /** 解析一个骰子 */
  function parseSingleDice(input: string): { x: number; y: number } {
    // 处理默认骰子情况
    if (input === "d" || input === "") {
      if (!defaultDice)
        throw new Error("未设置默认骰子");
      return { x: 1, y: defaultDice.current };
    }

    const num = Number(input);
    if (!Number.isNaN(num)) {
      return { x: Math.abs(num), y: 1 }; // 固定值视为1面骰子
    }

    // 分割d前后的数字
    const dIndex = input.indexOf("d");
    const hasD = dIndex !== -1;

    const xPart = hasD ? input.slice(0, dIndex) : input;
    const yPart = hasD ? input.slice(dIndex + 1) : "";

    // 解析x值
    const x = xPart ? Number.parseInt(xPart) : 1;
    if (Number.isNaN(x) || x < 1)
      throw new Error(`无效的骰子数量: ${xPart}`);

    // 解析y值
    const y = yPart ? Number.parseInt(yPart) : defaultDice.current;
    if (Number.isNaN(y) || y < 1) {
      throw new Error(`无效的骰子面数: ${yPart || "未指定"}`);
    }

    return { x, y };
  }

  /** 可以处理多个骰子相加 */
  function handleRoll(args: string[]): string {
    const input = args[0] || "";
    try {
      const diceSegments = parseDices(input);
      const segmentResults = [];

      // 计算每个骰子段的结果
      // 如果是一面骰, 那么直接放入结果
      for (const { sign, x, y } of diceSegments) {
        const rolls = (y !== 1)
          ? Array.from({ length: x }, () => rollDice(y))
          : [x];
        const segmentValue = rolls.reduce((sum, val) => sum + val, 0) * sign;
        segmentResults.push({ sign, rolls, segmentValue });
      }
      // 计算总和
      const total = segmentResults.reduce((sum, r) => sum + r.segmentValue, 0);
      // 构建展示表达式
      const expressionParts = [];
      const diceNotationParts = [];
      for (let i = 0; i < segmentResults.length; i++) {
        const { sign, rolls } = segmentResults[i];
        const { x, y } = diceSegments[i];
        const isFirst = i === 0;
        const notation = (y === 1)
          ? `${sign === -1 ? "-" : (isFirst ? "" : "+")}${x}`
          : `${sign === -1 ? "-" : (isFirst ? "" : "+")}${x}D${y}`;
        diceNotationParts.push(notation);

        // 结果展示部分
        const rollSum = rolls.reduce((a, b) => a + b, 0);
        if (isFirst) {
          expressionParts.push(rolls.length > 1 ? `${rolls.join("+")}` : `${rollSum}`);
        }
        else {
          const operator = sign === 1 ? "+" : "-";
          expressionParts.push(
            rolls.length > 1
              ? `${operator}(${rolls.join("+")})`
              : `${operator}${rollSum}`,
          );
        }
      }
      return `掷骰结果：${expressionParts.join("")}=${total}   (${diceNotationParts.join("")})`;
    }
    catch (error) {
      return `错误：${error ?? "未知错误"}`;
    }
  }

  /**
   *解析set命令(设置默认骰)
   * @const
   */
  function handleSet(args: string[]): string {
    const [faces] = args;
    if (!faces)
      throw new Error("缺少骰子面数参数");

    const y = Number.parseInt(faces);
    if (Number.isNaN(y) || y < 1)
      throw new Error("无效的骰子面数");

    localStorage.setItem("defaultDice", y.toString());
    defaultDice.current = y;
    return `已设置默认骰子为 ${y} 面骰`;
  }

  /**
   *设置属性
   * @const
   */
  function handleSt(args: string[]): string {
    const input = args[0];
    const ability: { [key: string]: number } = {};
    // 使用正则匹配所有属性+数值的组合
    const matches = input.matchAll(/(\D+)(\d+)/g);

    for (const match of matches) {
      const rawKey = match[1].trim();
      const value = Number.parseInt(match[2], 10);

      // 统一转换为小写进行比较
      const normalizedKey = rawKey.toLowerCase();

      // 查找映射关系
      if (ABILITY_MAP[normalizedKey]) {
        ability[ABILITY_MAP[normalizedKey]] = value;
      }
      else {
        ability[rawKey] = value;
      }
    }

    // 如果已存在能力就更新, 不然创建.
    if (abilityIds.length !== 0) {
      updateAbilityMutation.mutate({
        abilityId: abilityIds[0] ?? -1,
        ability,
        act: { default: "default" },
      });
    }
    else {
      setAbilityMutation.mutate({
        roleId,
        ruleId: 1,
        act: { default: "default" },
        ability,
      });
    }
    return `更新属性: ${JSON.stringify(ability, null, 2)}`;
  }

  /**
   *能力检定
   * @const
   */
  function handleRc(args: string[]): string {
    const [attr] = args;
    if (!attr)
      throw new Error("缺少技能名称");

    const value = attributes[attr];
    if (value === undefined)
      throw new Error(`未设置 ${attr} 属性值`);

    const roll = rollDice(100);
    return buildCheckResult(attr, roll, value);
  }

  /**
   * 构建检定结果
   * @param attr 属性名
   * @param roll 投掷结果
   * @param value 属性值
   * @const
   */
  function buildCheckResult(attr: string, roll: number, value: number): string {
    let result = "";
    const fifth = Math.floor(value / 5);
    const half = Math.floor(value / 2);

    if (roll <= 5) {
      result = "大成功";
    }
    else if (roll >= 96) {
      result = "大失败";
    }
    else if (roll > value) {
      result = "失败";
    }
    else if (roll <= fifth) {
      result = "极难成功";
    }
    else if (roll <= half) {
      result = "困难成功";
    }
    else {
      result = "普通成功";
    }

    return `${attr}检定：D100=${roll}/${value} ${result}`;
  }

  /**
   * SAN检定
   * @param args
   * @const
   */
  // TODO
  function handleSc(args: string[]): string {
    const [expr] = args;
    if (!expr)
      throw new Error("缺少SAN检定表达式");

    // 手动解析 1/2d5 格式
    const slashIndex = expr.indexOf("/");
    if (slashIndex === -1)
      throw new Error("无效的SAN检定格式");

    const successValStr = expr.slice(0, slashIndex);
    const failureExpr = expr.slice(slashIndex + 1);

    const successVal = Number.parseInt(successValStr);
    if (Number.isNaN(successVal))
      throw new Error("无效的成功扣除值");

    const san = attributes.san;
    if (san === undefined)
      throw new Error("未设置SAN值");

    const roll = rollDice(100);
    const loss = calculateSanLoss(roll, san, successVal, failureExpr);

    attributes.san = Math.max(san - loss, 0);
    return `SAN检定：${roll}/${san}，${roll <= san ? "成功" : "失败"}，SAN减少${loss}，剩余${attributes.san}`;
  }

  /** 计算SAN值扣除 */
  // TODO
  function calculateSanLoss(roll: number, san: number, successVal: number, failureExpr: string): number {
    if (roll <= san) {
      return successVal;
    }

    // 解析失败骰子表达式（如 2d5）
    const dIndex = failureExpr.indexOf("d");
    if (dIndex === -1)
      throw new Error("无效的失败骰子表达式");

    const xStr = failureExpr.slice(0, dIndex);
    const yStr = failureExpr.slice(dIndex + 1);

    const x = xStr ? Number.parseInt(xStr) : 1;
    const y = Number.parseInt(yStr);

    if (Number.isNaN(x) || x < 1 || Number.isNaN(y) || y < 1) {
      throw new Error("无效的失败骰子表达式");
    }

    return Array.from({ length: x }, () => rollDice(y))
      .reduce((sum, val) => sum + val, 0);
  }

  /**
   * 能力成长检定
   */
  // TODO
  function handleEn(args: string[]): string {
    const [attr] = args;
    if (!attr)
      throw new Error("缺少技能名称");

    const value = attributes[attr];
    if (value === undefined)
      throw new Error(`未设置 ${attr} 属性值`);

    const roll = rollDice(100);
    if (roll > value) {
      const gain = rollDice(10);
      attributes[attr] += gain;
      return `${attr}成长检定：${roll}/${value} 成功，增加${gain}，当前值${attributes[attr]}`;
    }
    return `${attr}成长检定：${roll}/${value} 失败`;
  }

  function rollDice(sides: number): number {
    return Math.floor(Math.random() * sides) + 1;
  }

  return execute;
}
