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

import { roll } from "./dice";

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

/**
 * 命令执行器钩子函数
 * @param roleId roleId，会根据ruleId来获取对应角色的ability值
 * @param ruleId 规则ID，会根据ruleId来获取对应角色对应规则下的能力组
 */
export default function useCommandExecutor(roleId: number, ruleId: number) {
  const { spaceId: _, roomId: urlRoomId } = useParams();
  const roomId = Number(urlRoomId);
  const role = useGetRoleQuery(roleId).data?.data;

  // 可以通过以下代码获取用户信息
  // const globalContext = useGlobalContext();
  // const userId = globalContext.userId;
  // const userInfo = useGetUserInfoQuery().data?.data;

  const defaultDice = useRef(100);

  const abilityQuery = useGetRoleAbilitiesQuery(roleId);
  const abilityList = abilityQuery.data?.data ?? [];
  // 当前规则下激活的能力组
  const curAbility = abilityList.find(a => a.ruleId === ruleId);

  // 通过以下的mutation来对后端发送引起数据变动的请求
  const updateAbilityMutation = useUpdateRoleAbilityMutation(); // 更改属性与能力字段
  const setAbilityMutation = useSetRoleAbilityMutation(); // 创建新的能力组
  const initiativeListMutation = useRoomInitiativeListMutation(roomId); // 更新先攻表

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
        case "r":
          return handleRoll(args).result;
        case "rd":
          return handleRd(args).result;
        case "set":
          return handleSet(args);
        case "st":
          return handleSt(args);
        case "rc":
          return handleRc(args);
        case "ra":
          return handleRc(args);
        case "ri":
          return handleRi(args);
        case "sc":
          return handleSc(args);
        case "ti":
          return handleTi(args);
        case "li":
          return handleLi(args);
        default:
          return `未知命令 ${cmdPart}`;
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

  function handleRd(args: string[]) {
    return handleRoll(["d", ...args]);
  }

  function handleRoll(args: string[]) {
    const input = args.join("");
    try {
      const diceResult = roll(input);
      return { result: `掷骰结果：${input} = ${diceResult.expanded} = ${diceResult.result}`, total: diceResult.result };
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

    // st show 实现，目前仍使用聊天文本返回结果
    // TODO 添加弹出窗口响应`st show`的属性展示
    if (args[0]?.toLowerCase() === "show") {
      if (!curAbility?.ability) {
        return "未设置角色属性";
      }

      const showProps = args.slice(1).filter(arg => arg.trim() !== "");
      if (showProps.length === 0) {
        return "请指定要展示的属性";
      }

      const result: string[] = [];
      for (const prop of showProps) {
        const normalizedKey = prop.toLowerCase();
        const key = ABILITY_MAP[normalizedKey] || prop;
        const value = curAbility.ability[key] ?? 0; // 修改这里，添加默认值0

        result.push(`${key}: ${value}`);
      }

      return `${role?.roleName || "当前角色"}的属性展示：\n${result.join("\n")}`;
    }

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
    // 所有参数转为小写
    args = args.map(arg => arg.toLowerCase());
    // 解析参数
    // 1. 以正负号开头的数字
    const signedNumbers = args.filter(str => /^[+-]\d+(?:\.\d+)?$/.test(str));

    // 2. 无符号数字
    const unsignedNumbers = args.filter(str => /^\d+(?:\.\d+)?$/.test(str));

    // 3. 数字（可无）跟字母b或p
    const numWithBp = args.filter(str => /^\d*[bp]$/.test(str));

    // 4. 其他
    const names = args.filter(str =>
      !/^[+-]\d+(?:\.\d+)?$/.test(str)
      && !/^\d+(?:\.\d+)?$/.test(str)
      && !/^\d*[bp]$/.test(str),
    );
    const [attr] = unsignedNumbers;
    const [bonus] = signedNumbers;
    // 计算加权总和
    const bp: number = numWithBp.reduce((sum, item) => {
      // 正则匹配：提取数字部分（可含正负号）和末尾的b/p
      const match = item.match(/^([+-]?\d*)([bp])$/);
      if (!match) {
        throw new Error(`无效元素: ${item}`); // 处理不符合格式的元素
      }

      const [, numStr, letter] = match;
      // 数字部分为空时，默认n=1；否则转换为整数（支持正负）
      const n = numStr === "" ? 1 : Number.parseInt(numStr, 10);
      // 确定权重
      const weight = letter === "b" ? 1 : -1;

      return sum + n * weight;
    }, 0);
    let [name] = names;
    // 补丁：添加对于英文简写属性不可读的临时解决方案
    // TODO 后续添加更健壮的属性解析方案
    if (!name) {
      throw new Error("缺少技能名称");
    }
    if (ABILITY_MAP[name.toLowerCase()]) {
      name = ABILITY_MAP[name.toLowerCase()];
    }
    if (!curAbility?.ability) {
      throw new Error(`未设置 ${name} 属性值`);
    }

    let value = curAbility?.ability[name];

    if (value === undefined && attr === undefined) {
      throw new Error(`未设置 ${name} 属性值`);
    }

    if (attr !== undefined) {
      value = Number.parseInt(attr);
    }

    if (bonus !== undefined) {
      value += Number.parseInt(bonus);
    }

    if (value < 0) {
      value = 0;
    }

    const roll: number[] = rollDiceWithBP(bp);
    let result: string = buildCheckResult(name, roll[0], value);
    if (bp > 0) {
      result += ` 奖励骰 [${roll.slice(1).join(",")}]`;
    }
    if (bp < 0) {
      result += ` 惩罚骰 [${roll.slice(1).join(",")}]`;
    }
    return result;
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
      actualLoss = Math.min(...failureLoss.possibleValues); // 大成功时失去最小san值
      result = "大成功";
    }
    // 大失败判定
    else if (roll >= 96) {
      actualLoss = Math.max(...successLoss.possibleValues); // 大失败时失去最大san值
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
    let res: string = `理智检定：D100=${roll}/${currentSan} ${result}\n`
      + `损失san值：${actualLoss}\n`
      + `当前san值：${newSan}`;
    if (actualLoss >= 5) {
      res += `\n注意：单次失去理智值达到5点，请进行智力检定，若检定成功角色将陷入疯狂。疯狂后请使用\`.ti\`或\`.li\`指令抽取临时症状或总结症状。`;
    }
    return res;
  }

  /**
   * 抽取疯狂发作的临时症状
   * 格式: .ti
   */
  function handleTi(_args: string[]): string {
    const boutsOfMadnessForRealTimeList = [
      {
        name: "失忆",
        desc: "调查员对自己上一次抵达安全的场所后发生的事一无所知。在其看来上一刻他还在吃着早餐，而下一刻就已经身处怪物面前。",
      },
      { name: "假性残疾", desc: "调查员陷入因心理作用引起的失明、耳聋或肢体失能中。" },
      { name: "暴力倾向", desc: "调查员沉浸于狂怒，开始对四周的一切施加失控的暴力与破坏行为，无论敌友。" },
      {
        name: "偏执妄想",
        desc: "调查员陷入严重的偏执妄想之中。所有人都正在与他为敌！没人值得信任！他正在被窥视着，有人背叛了他，他所看见的皆是虚伪的幻象。",
      },
      {
        name: "人际依赖",
        desc: "浏览调查员􀀀景故事的“重要之人”条目。调查员会将当前场景中的另一人误当做他的重要之人。调查员将依照他与重要之人之间关系的性质行事。",
      },
      { name: "昏厥", desc: "调查员会立即昏倒" },
      {
        name: "惊慌逃窜",
        desc: "调查员会无法自制地用一切可能的方法远远逃开，即使这意味着他需要开走唯一的一辆车并抛下其他所有人。",
      },
      { name: "歇斯底里", desc: "调查员情不自禁地开始狂笑、哭泣、尖叫，等等。" },
      {
        name: "恐惧症",
        desc: "调查员患上一项新的恐惧症。掷1D100并查阅表9：范例恐惧症，或由守秘人选择一项。即使引发这些恐惧症的源头并不在身边，调查员仍会在疯狂发作期间想象那些东西正在那里。",
      },
      {
        name: "躁狂症",
        desc: "调查员患上一项新的躁狂症。掷1D100 并查阅表10：范例躁狂症，或由守秘人选择一项。调查员会在疯狂发作期间中沉浸在他新的躁狂症中。",
      },
    ];
    const res = boutsOfMadnessForRealTimeList[rollDice(boutsOfMadnessForRealTimeList.length) - 1];
    const timeOfDuration = rollDice(10);
    return `疯狂发作-即时症状：\n${res.name}\n持续时间：${timeOfDuration}轮\n${res.desc}`;
  }

  /**
   * 抽取疯狂发作的总结症状
   * 格式:.li
   */
  function handleLi(_args: string[]): string {
    const boutsOfMadnessForSummaryList = [
      { name: "失忆", desc: "调查员恢复神志时身处陌生地点，连自己是谁都不记得。记忆会随时间流逝逐渐恢复。" },
      {
        name: "被劫",
        desc: "调查员恢复神志时，财物已遭人打劫，但没有受到人身伤害。如果其携带着宝贵之物（参考调查员背景故事），进行一次幸运检定决定它是否被盗。其他所有值钱的物品都会自动丢失。",
      },
      {
        name: "遍体鳞伤",
        desc: "调查员恢复神志时，遍体鳞伤，浑身淤青。生命值降低至疯狂前的一半，但这不会造成重伤。调查员的财物没有被劫走。这些伤害如何造成由守秘人决定。",
      },
      {
        name: "暴力",
        desc: "调查员的情绪在暴力和破坏的冲动中爆发。调查员恢复神志时可能记得自己做过的事，也可能不记得。调查员对谁、对什么东西施以暴力，是杀死还是仅仅造成伤害，这些都由守秘人决定。",
      },
      {
        name: "思想与信念",
        desc: "浏览调查员背景故事的“思想与信念”条目。调查员选择其中一项，将它以极端、疯魔、形之于色的方式展现出来。例如，信仰宗教的人后来可能在地铁上大声宣讲福音。",
      },
      {
        name: "重要之人",
        desc: "浏览调查员背景故事的“重要之人”条目，及其重要的原因。在略过的时间中，调查员会尽一切努力接近重要之人，并以某种行动展现他们之间的关系。",
      },
      { name: "被收容", desc: "调查员恢复神志时身处精神病房或者警局拘留室当中。调查员会逐渐回想起他们身处此地的原因。" },
      {
        name: "惊慌逃窜",
        desc: "调查员恢复神志时已经身处很远的地方，可能在荒野中迷失了方向，或是正坐在火车或长途巴士上。",
      },
      {
        name: "恐惧症",
        desc: "调查员患上一项新的恐惧症。掷1D100并查阅表9：范例恐惧症，或由守秘人选择一项。即使引发这些恐惧症的源头并不在身边，调查员仍会在疯狂发作期间想象那些东西正在那里。",
      },
      {
        name: "躁狂症",
        desc: "调查员患上一项新的躁狂症。掷1D100 并查阅表10：范例躁狂症，或由守秘人选择一项。调查员会在疯狂发作期间中沉浸在他新的躁狂症中。",
      },
    ];
    const res = boutsOfMadnessForSummaryList[rollDice(boutsOfMadnessForSummaryList.length) - 1];
    const timeOfDuration = rollDice(10);
    return `疯狂发作-总结症状：\n${res.name}\n已略过时间：${timeOfDuration}小时\n${res.desc}`;
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

  /**
   * 带奖励骰和惩罚骰的检定掷骰
   * @param bp 奖励骰数，负数表示惩罚骰数
   * @returns 骰子结果数组 [最终结果, 奖励/惩罚骰1, 奖励/惩罚骰2,...]
   */
  function rollDiceWithBP(bp: number = 0): number[] {
    let bonus: boolean = false;
    const result: number[] = Array.from({ length: bp + 2 });
    if (bp > 0) {
      bonus = true;
    }
    bp = Math.abs(bp);
    let tens = Math.floor(Math.random() * 10);
    const ones = Math.floor(Math.random() * 10);
    result[1] = tens;
    for (let i = 1; i <= bp; i++) {
      const roll = Math.floor(Math.random() * 10);
      if ((connect2D10(tens, ones) > connect2D10(roll, ones)) === bonus) {
        tens = roll;
      }
      result[i + 1] = roll;
    }
    result[0] = connect2D10(tens, ones);
    return result;
  }

  /**
   * 将d100的个位数和十位数连接起来，其中‘00’会被替换为‘100’
   */
  function connect2D10(tens: number, ones: number) {
    let result = tens * 10 + ones;
    if (result === 0) {
      result = 100;
    }
    return result;
  }

  return execute;
}
