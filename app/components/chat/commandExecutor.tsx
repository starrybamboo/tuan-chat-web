// type DiceResult = { x: number; y: number; rolls: number[]; total: number };
import { useGetRoleAbilitiesQuery } from "../../../api/queryHooks";

export function isCommand(command: string) {
  const trimmed = command.trim();
  return (trimmed.startsWith(".") || trimmed.startsWith("。"));
}

export class CommandExecutor {
  // 从localstorage中获取吧
  public defaultDice: number = 0;
  public attributes: Record<string, number> = {};

  constructor(readonly roleId: number) {}

  execute(command: string): string {
    const [cmdPart, ...args] = this.parseCommand(command);
    const normalizedCmd = cmdPart.toLowerCase();

    try {
      switch (normalizedCmd) {
        case "r": return this.handleRoll(args);
        case "set": return this.handleSet(args);
        case "st": return this.handleSt(args);
        case "rc": return this.handleRc(args);
        case "sc": return this.handleSc(args);
        case "en": return this.handleEn(args);
        case "ti":
        case "li": return "疯狂症状功能暂未实现";
        default: return "未知命令";
      }
    }
    catch (e) {
      return `执行错误：${e instanceof Error ? e.message : String(e)}`;
    }
  }

  private parseCommand(input: string): [string, ...string[]] {
    const trimmed = input.trim();
    if (!(trimmed.startsWith(".") || trimmed.startsWith("。"))) {
      throw new Error("命令需要以.或。开头");
    }
    return trimmed.slice(1).split(/\s+/) as [string, ...string[]];
  }

  /** 核心骰子解析逻辑 */
  private parseDice(input: string): { x: number; y: number } {
    // 处理默认骰子情况
    if (input === "d" || input === "") {
      if (!this.defaultDice)
        throw new Error("未设置默认骰子");
      return { x: 1, y: this.defaultDice };
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
    const y = yPart ? Number.parseInt(yPart) : this.defaultDice;
    if (Number.isNaN(y) || y < 1) {
      throw new Error(`无效的骰子面数: ${yPart || "未指定"}`);
    }

    return { x, y };
  }

  private handleRoll(args: string[]): string {
    const input = args[0] || "";
    const { x, y } = this.parseDice(input);
    const rolls = Array.from({ length: x }, () => this.rollDice(y));
    const total = rolls.reduce((sum, val) => sum + val, 0);
    return `掷骰结果：${rolls.join("+")}=${total} (${x}D${y})`;
  }

  // TODO 也许可以把默认值设置到localstorage
  private handleSet(args: string[]): string {
    const [faces] = args;
    if (!faces)
      throw new Error("缺少骰子面数参数");

    const y = Number.parseInt(faces);
    if (Number.isNaN(y) || y < 1)
      throw new Error("无效的骰子面数");

    this.defaultDice = y;
    return `已设置默认骰子为 ${y} 面骰`;
  }

  private handleSt(args: string[]): string {
    const [attr, valueStr] = args;
    if (!attr || !valueStr)
      throw new Error("缺少参数");

    const value = Number.parseInt(valueStr);
    if (Number.isNaN(value))
      throw new Error("无效的数值");

    this.attributes[attr] = value;
    return `${attr} 已设置为 ${value}`;
  }

  private handleRc(args: string[]): string {
    const [attr] = args;
    if (!attr)
      throw new Error("缺少技能名称");

    const value = this.attributes[attr];
    if (value === undefined)
      throw new Error(`未设置 ${attr} 属性值`);

    const roll = this.rollDice(100);
    return this.buildCheckResult(attr, roll, value);
  }

  /** 构建检定结果描述 */
  private buildCheckResult(attr: string, roll: number, value: number): string {
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

  // TODO
  private handleSc(args: string[]): string {
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

    const san = this.attributes.san;
    if (san === undefined)
      throw new Error("未设置SAN值");

    const roll = this.rollDice(100);
    const loss = this.calculateSanLoss(roll, san, successVal, failureExpr);

    this.attributes.san = Math.max(san - loss, 0);
    return `SAN检定：${roll}/${san}，${roll <= san ? "成功" : "失败"}，SAN减少${loss}，剩余${this.attributes.san}`;
  }

  /** 计算SAN值扣除 */
  // TODO
  private calculateSanLoss(roll: number, san: number, successVal: number, failureExpr: string): number {
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

    return Array.from({ length: x }, () => this.rollDice(y))
      .reduce((sum, val) => sum + val, 0);
  }

  // TODO
  private handleEn(args: string[]): string {
    const [attr] = args;
    if (!attr)
      throw new Error("缺少技能名称");

    const value = this.attributes[attr];
    if (value === undefined)
      throw new Error(`未设置 ${attr} 属性值`);

    const roll = this.rollDice(100);
    if (roll > value) {
      const gain = this.rollDice(10);
      this.attributes[attr] += gain;
      return `${attr}成长检定：${roll}/${value} 成功，增加${gain}，当前值${this.attributes[attr]}`;
    }
    return `${attr}成长检定：${roll}/${value} 失败`;
  }

  private rollDice(sides: number): number {
    return Math.floor(Math.random() * sides) + 1;
  }
}

export default function useCommandExecutor(roleId: number) {
  const executor = new CommandExecutor(roleId);
  const abilityQuery = useGetRoleAbilitiesQuery(roleId);
  // 合并所有的ability
  const mergedAbilities = abilityQuery.data?.data?.reduce((acc, cur) => {
    if (cur?.ability) {
      return { ...acc, ...cur.ability };
    }
    return acc;
  }, {} as Record<string, number>);
  // 更新执行器属性
  if (mergedAbilities) {
    executor.attributes = mergedAbilities;
  }

  return executor;
}
