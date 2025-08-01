/**
 * 命令执行器类，封装命令信息和执行逻辑
 *
 * @property {CommandInfo} cmdInfo - 命令的元信息
 * @property {Function} solve - 命令执行函数，接收参数数组并返回执行结果
 */
export class CommandExecutor {
  cmdInfo: CommandInfo;
  // TODO: 这里CharacterInfo具体类型需要等待接口。
  solve: (args: string[], operator: CharacterInfo, Ats: CharacterInfo[], cpi: CPI) => Promise<CommandResult>;

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

type CPI = {
  // 获取同步后的基础数据（角色卡数据，后期可能会有用户配置之类的其他东西）
  getData: <T>(unit: string, key: string) => T | null;
  // 保存数据（自动触发钩子同步）
  saveData: (unit: string, key: string, data: any) => Promise<boolean>;
  // 发送消息
  sendMsg: (msg: string) => void;
};

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
  execute(name: string, args: string[], operator: CharacterInfo, Ats: CharacterInfo[], cpi: CPI): boolean {
    const cmd = this.cmdMap.get(name);
    if (cmd) {
      return cmd.solve(args, operator, Ats, cpi);
    }
    throw new Error(`Command ${name} not found in rule ${this.name}`);
  }
}
