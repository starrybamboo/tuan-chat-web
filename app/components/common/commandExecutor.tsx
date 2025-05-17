import { useEffect, useRef } from "react";
import { useParams } from "react-router";
import {
  useGetRoleAbilitiesQuery,
  useSetRoleAbilityMutation,
  useUpdateRoleAbilityMutation,
} from "../../../api/hooks/abilityQueryHooks";
import {
  useGetRoomInitiativeListQuery,
  useRoomInitiativeListMutation,
} from "../../../api/hooks/chatQueryHooks";
import { useGetRoleQuery } from "../../../api/queryHooks";
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

export default function useCommandExecutor(roleId: number, ruleId: number) {
  const { spaceId: _, roomId: urlRoomId } = useParams();
  const roomId = Number(urlRoomId);

  const role = useGetRoleQuery(roleId).data?.data;

  const defaultDice = useRef(100);

  const abilityQuery = useGetRoleAbilitiesQuery(roleId);
  const abilityList = abilityQuery.data?.data ?? [];
  // 当前规则下激活的能力
  const curAbility = abilityList.find(a => a.ruleId === ruleId);

  const updateAbilityMutation = useUpdateRoleAbilityMutation();
  const setAbilityMutation = useSetRoleAbilityMutation();

  const initiativeListMutation = useRoomInitiativeListMutation(roomId);
  const initiativeList = useGetRoomInitiativeListQuery(roomId).data ?? [];

  useEffect(() => {
    try {
      defaultDice.current = Number(localStorage.getItem("defaultDice")) ?? 100;
    }
    catch (e) {
      console.error(e);
    }
  }, []);

  /**
   * 返回这个函数
   * @param command
   */
  function execute(command: string): string {
    const [cmdPart, ...args] = parseCommand(command);

    try {
      switch (cmdPart) {
        case "r": return handleRoll(args).result;
        case "set": return handleSet(args);
        case "st": return handleSt(args);
        case "rc": return handleRc(args);
        case "ri": return handleRi(args);
        case "sc": return handleSc(args);
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
    const args = trimmed.slice(cmdPart.length).trim().split(/\s+/).filter(arg => arg !== "");
    return [cmdPart.toLowerCase(), ...args];
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
  function handleRoll(args: string[]) {
    const input = args.join("");
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
      return { result: `掷骰结果：${expressionParts.join("")}=${total}   (${diceNotationParts.join("")})`, total };
    }
    catch (error) {
      return { result: `错误：${error ?? "未知错误"}`, total: undefined };
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
    const input = args.join("");
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
    if (curAbility) {
      updateAbilityMutation.mutate({
        abilityId: curAbility.abilityId ?? -1,
        ability,
        act: {},
      });
    }
    else {
      setAbilityMutation.mutate({
        roleId,
        ruleId,
        act: {},
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
    if (!curAbility?.ability)
      throw new Error(`未设置 ${attr} 属性值`);

    const value = curAbility?.ability[attr];
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
   *先攻 args[0] 如果不能被解析成骰子表达式，则视为角色名；args[1]在args[0]为角色名的时候可以作为骰子表达式
   */
  function handleRi(args: string[]): string {
    let initiative: number | undefined;
    let name: string | undefined;
    try {
      if (args.length !== 0) {
        initiative = handleRiExpression(args[0]);
        if (!initiative) {
          name = args[0];
        }
        if (args.length > 1) {
          name = args[1];
        }
      }
    }
    catch (e) {
      return e?.toString() ?? "不合规的表达式";
    }
    if (!initiative) {
      initiative = rollDice(20);
    }
    if (!name) {
      name = role?.roleName;
    }
    if (initiative && name) {
      initiativeListMutation.mutate(
        JSON.stringify(
          [...initiativeList.filter(i => i.name !== name), { name, value: initiative }]
            .sort((a, b) => b.value - a.value),
        ),
      );
    }
    else {
      return "不合规的表达式";
    }
    return `${name}的先攻更新为${initiative}`;
  }
  // 解析Ri命令下的特殊骰子表达式
  function handleRiExpression(arg: string) {
    if (arg.startsWith("+")) {
      const rollResult = handleRoll([arg.slice(1)]);
      if (!rollResult.total) {
        return undefined;
      }
      return rollDice(20) + rollResult.total;
    }
    else if (arg.startsWith("-")) {
      const rollResult = handleRoll([arg.slice(1)]);
      if (!rollResult.total) {
        return undefined;
      }
      return rollDice(20) - rollResult.total;
    }
    else {
      return handleRoll([arg]).total;
    }
  }

  /**
   * 处理理智检定指令
   * 格式: .sc[成功损失]/[失败损失] ([当前san值])
   */
  function handleSc(args: string[]): string {
    // 解析参数
    const [lossExpr, currentSanArg] = args;

    // 获取当前san值，优先使用参数，其次从角色卡获取
    let currentSan: number;
    if (currentSanArg) {
      currentSan = Number.parseInt(currentSanArg);
      if (Number.isNaN(currentSan)) {
        throw new TypeError("无效的当前san值");
      }
    }
    else {
      if (!curAbility?.ability)
        throw new Error("未设置角色属性");
      currentSan = curAbility.ability["san值"] || curAbility.ability.san;
      if (currentSan === undefined)
        throw new Error("角色卡中没有设置san值");
    }

    // 解析损失表达式
    const [successLossStr, failureLossStr] = lossExpr.split("/");
    if (!successLossStr || !failureLossStr) {
      throw new Error("损失表达式格式错误，应为[成功损失]/[失败损失]");
    }

    // 解析成功和失败的损失值
    const successLoss = parseDiceExpression(successLossStr);
    const failureLoss = parseDiceExpression(failureLossStr);

    // 进行理智检定
    const roll = rollDice(100);
    let result: string;
    let actualLoss: number;

    // 大成功判定
    if (roll <= 5) {
      actualLoss = Math.max(...failureLoss.possibleValues); // 大失败时失去最大san值
      result = "大成功";
    }
    // 大失败判定
    else if (roll >= 96) {
      actualLoss = Math.max(...successLoss.possibleValues); // 大成功时失去最小san值
      result = "大失败";
    }
    // 普通成功
    else if (roll <= currentSan) {
      actualLoss = successLoss.value;
      result = "成功";
    }
    // 普通失败
    else {
      actualLoss = failureLoss.value;
      result = "失败";
    }

    // 计算新san值
    const newSan = currentSan - actualLoss;

    // 更新角色卡中的san值
    if (curAbility) {
      const ability = { ...curAbility.ability };
      ability["san值"] = newSan;
      ability.san = newSan;

      if (curAbility.abilityId) {
        updateAbilityMutation.mutate({
          abilityId: curAbility.abilityId,
          ability,
          act: {},
        });
      }
      else {
        setAbilityMutation.mutate({
          roleId,
          ruleId,
          act: {},
          ability,
        });
      }
    }

    // 构建返回信息
    return `理智检定：D100=${roll}/${currentSan} ${result}\n`
      + `损失san值：${actualLoss}\n`
      + `当前san值：${newSan}`;
  }

  /**
   * 解析单个的骰子表达式 (如1d6, 2d10, 3等)，并返回结果和可能的最大值与最小值
   */
  function parseDiceExpression(expr: string): { value: number; possibleValues: number[] } {
    // 固定值
    if (!expr.includes("d")) {
      const value = Number.parseInt(expr);
      if (Number.isNaN(value))
        throw new Error(`无效的骰子表达式: ${expr}`);
      return {
        value,
        possibleValues: [value],
      };
    }

    // 骰子表达式
    const [countStr, sidesStr] = expr.split("d");
    const count = countStr ? Number.parseInt(countStr) : 1;
    const sides = sidesStr ? Number.parseInt(sidesStr) : defaultDice.current;

    if (Number.isNaN(count) || Number.isNaN(sides) || count < 1 || sides < 1) {
      throw new Error(`无效的骰子表达式: ${expr}`);
    }

    // 计算可能的值范围
    const min = count;
    const max = count * sides;
    const possibleValues = Array.from({ length: max - min + 1 }, (_, i) => min + i);

    let value = 0;
    for (let i = 0; i < count; i++) {
      value += rollDice(sides);
    }

    return {
      value,
      possibleValues,
    };
  }
  function rollDice(sides: number): number {
    return Math.floor(Math.random() * sides) + 1;
  }

  return execute;
}
