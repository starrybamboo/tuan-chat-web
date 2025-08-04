import type { RoleAbility, UserRole } from "../../../../api";

interface ExecutorProp { // eslint-disable-line
  /**
   * 房间ID
   */
  roomId: number;
  /**
   * 指令消息id;
   * 用于后续的指令回复,避免消息混乱;
   */
  replyMessageId: number;
  /**
   * 骰娘的角色ID
   */
  dicerRoleId: number;
  /**
   * 骰娘的头像ID
   */
  dicerAvatarId: number;
  /**
   * 命令的主体, 不带前置的标点, 即英文句号，也不包含@的人
   */
  command: string;
  /**
   * 聊天框中@的角色
   */
  mentionedRoles?: UserRole[];
}

/**
 * 命令执行器类，封装命令信息和执行逻辑
 *
 * @property {CommandInfo} cmdInfo - 命令的元信息
 * @property {Function} solve - 命令执行函数，接收参数数组并返回执行结果
 */
export class CommandExecutor {
  cmdInfo: CommandInfo;
  // TODO: 这里CharacterInfo具体类型需要等待接口。
  solve: (args: string[], operator: CharacterInfo, Ats: CharacterInfo[], cpi: CPI, prop: ExecutorProp) => Promise<CommandResult>;

  /**
   * 构造函数
   * @param {string} name - 命令名称
   * @param {string[]} alias - 命令别名数组
   * @param {string} description - 命令描述
   * @param {string[]} examples - 使用示例数组
   * @param {string} usage - 用法说明
   * @param {Function} solve - 命令执行函数
   */
  constructor(name: string, alias: string[], description: string, examples: string[], usage: string, solve: (args: string[], operator: CharacterInfo, Ats: CharacterInfo[], cpi: CPI) => CommandResult) {
    this.cmdInfo = { name, alias, description, examples, usage };
    this.solve = solve;
  }
}

type CommandInfo = {
  name: string;
  alias: string[];
  description: string;
  examples: string[];
  usage: string;
};

type CommandResult = {
  success: boolean; // 执行状态：true 成功，false 失败
  data?: any; // 成功时返回的业务结果（如骰子点数、统计数据）
  error?: { // 失败时的错误详情
    type: string; // 错误类型（如 'paramInvalid'、'ruleNotSupported'）
    message: string; // 错误描述（供日志或用户提示）
  };
};

interface CPI { // eslint-disable-line
  // 发送消息
  sendMsg: (prop: ExecutorProp, msg: string) => void;
  // 获取角色能力列表
  getRoleAbilityList: (roleId: number) => RoleAbility;
  // 设置角色能力列表
  setRoleAbilityList: (roleId: number, ability: RoleAbility) => void;
}

/**
 * 规则命名空间类，用于管理和执行一组相关命令
 *
 * @property {number} id - 命名空间的唯一标识符
 * @property {string} name - 命名空间名称
 * @property {string[]} alias - 命名空间别名数组
 * @property {string} description - 命名空间描述
 * @property {Map<string, CommandExecutor>} cmdMap - 命令映射表，存储命令名称/别名与执行器的映射
 *
 * @example
 * // 创建一个coc7th命名空间
 * const combatRules = new RuleNameSpace(
 *   0,
 *   "coc7th",
 *   ["coc", "coc7"],
 *   "规则coc7th的指令集"
 * );
 *
 * // 添加一个先攻命令
 * combatRules.addCmd(new CmdExecutor(
 *   "ri", ["init", "先攻"],
 *   "进行先攻检定",
 *   ["ri 力量", "ri +2 敏捷"],
 *   "ri [属性名|骰子表达式]",
 *   handleRi
 * ));
 */
export class RuleNameSpace {
  id: number;
  name: string;
  alias: string[];
  description: string;
  cmdMap: Map<string, CommandExecutor>;

  /**
   * 构造函数
   * @param {number} id - 命名空间ID
   * @param {string} name - 命名空间名称
   * @param {string[]} alias - 命名空间别名
   * @param {string} description - 命名空间描述
   */
  constructor(id: number, name: string, alias: string[], description: string) {
    this.id = id;
    this.name = name;
    this.alias = alias;
    this.description = description;
    this.cmdMap = new Map();
  }

  /**
   * 添加命令到命名空间
   * @param {CommandExecutor} cmd - 要添加的命令执行器
   */
  addCmd(cmd: CommandExecutor) {
    this.cmdMap.set(cmd.cmdInfo.name, cmd);
    cmd.cmdInfo.alias.forEach((alias) => {
      this.cmdMap.set(alias, cmd);
    });
  }

  /**
   * 获取命令信息
   * @param {string} name - 命令名称或别名
   * @returns {CommandInfo | undefined} 命令信息对象，如果不存在则返回undefined
   */
  getCmd(name: string): CommandInfo | undefined {
    return this.cmdMap.get(name)?.cmdInfo;
  }

  /**
   * 获取命名空间下所有命令的列表
   * @returns {CommandInfo[]} 命令信息数组
   */
  getCmdList(): CommandInfo[] {
    return Array.from(this.cmdMap.values()).map(cmd => cmd.cmdInfo);
  }

  /**
   * 执行命令
   * @param {string} name - 命令名称或别名
   * @param {string[]} args - 命令参数数组
   * @param {CharacterInfo} operator - 操作者信息
   * @param {CharacterInfo[]} Ats - At列表信息数组
   * @param {CPI} cpi -CmdPre接口对象
   * @returns {boolean} 命令执行结果
   * @throws {Error} 当命令不存在时抛出错误
   */
  execute(name: string, args: string[], operator: UserRole, Ats: UserRole[], cpi: CPI, prop: ExecutorProp): boolean {
    const cmd = this.cmdMap.get(name);
    if (cmd) {
      return cmd.solve(args, operator, Ats, cpi, prop);
    }
    throw new Error(`Command ${name} not found in rule ${this.name}`);
  }
}
