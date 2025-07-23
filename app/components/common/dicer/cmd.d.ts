/**
 * 命令执行器类，封装命令信息和执行逻辑
 *
 * @property {CmdInfo} cmdInfo - 命令的元信息
 * @property {Function} solve - 命令执行函数，接收参数数组并返回执行结果
 */
export class CmdExecutor {
  cmdInfo: CmdInfo;
  solve: (args: string[], operator: CharacterInfo, Ats: CharacterInfo[]) => boolean;

  /**
   * 构造函数
   * @param {string} name - 命令名称
   * @param {string[]} alias - 命令别名数组
   * @param {string} description - 命令描述
   * @param {string[]} examples - 使用示例数组
   * @param {string} usage - 用法说明
   * @param {Function} solve - 命令执行函数
   */
  constructor(name: string, alias: string[], description: string, examples: string[], usage: string, solve: (args: string[], operator: CharacterInfo, Ats: CharacterInfo[]) => boolean) {
    this.cmdInfo = { name, alias, description, examples, usage };
    this.solve = solve;
  }
}

type CmdInfo = {
  name: string;
  alias: string[];
  description: string;
  examples: string[];
  usage: string;
};

type CharacterInfo = {
  ownerName: string;
  isGM: boolean;
  // TODO: 在这里添加重构后的角色卡数据结构
  role: Role;
};

/**
 * 规则命名空间类，用于管理和执行一组相关命令
 *
 * @property {number} id - 命名空间的唯一标识符
 * @property {string} name - 命名空间名称
 * @property {string[]} alias - 命名空间别名数组
 * @property {string} description - 命名空间描述
 * @property {Map<string, CmdExecutor>} cmdMap - 命令映射表，存储命令名称/别名与执行器的映射
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
  cmdMap: Map<string, CmdExecutor>;

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
   * @param {CmdExecutor} cmd - 要添加的命令执行器
   */
  addCmd(cmd: CmdExecutor) {
    this.cmdMap.set(cmd.cmdInfo.name, cmd);
    cmd.cmdInfo.alias.forEach((alias) => {
      this.cmdMap.set(alias, cmd);
    });
  }

  /**
   * 获取命令信息
   * @param {string} name - 命令名称或别名
   * @returns {CmdInfo | undefined} 命令信息对象，如果不存在则返回undefined
   */
  getCmd(name: string): CmdInfo | undefined {
    return this.cmdMap.get(name)?.cmdInfo;
  }

  /**
   * 获取命名空间下所有命令的列表
   * @returns {CmdInfo[]} 命令信息数组
   */
  getCmdList(): CmdInfo[] {
    return Array.from(this.cmdMap.values()).map(cmd => cmd.cmdInfo);
  }

  /**
   * 执行命令
   * @param {string} name - 命令名称或别名
   * @param {string[]} args - 命令参数数组
   * @returns {boolean} 命令执行结果
   * @throws {Error} 当命令不存在时抛出错误
   */
  execute(name: string, args: string[]): boolean {
    const cmd = this.cmdMap.get(name);
    if (cmd) {
      return cmd.solve(args);
    }
    throw new Error(`Command ${name} not found in rule ${this.name}`);
  }
}
