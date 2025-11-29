/**
 * 规则命名空间类，用于管理和执行一组相关命令
 *
 * @property {number} id - 命名空间的唯一标识符
 * @property {string} name - 命名空间名称
 * @property {string[]} alias - 命名空间别名数组
 * @property {string} description - 命名空间描述
 * @property {Map<string, CommandExecutor>} cmdMap - 命令映射表，存储命令名称/别名与执行器的映射
 * @property {Map<string, string>} aliasMap - 别名映射表，存储角色能力字段的映射
 * @property {Map<string, (ability: RoleAbility) => { type: string; value: string | number }>} dependentValueMap - 因变量映射表，存储因变量字段名与其方程的映射
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
  aliasMap: Map<string, string>;
  dependentValueMap: Map<string, (ability: RoleAbility) => { type: string; value: string | number }>;

  /**
   * 构造函数
   * @param {number} id - 命名空间ID
   * @param {string} name - 命名空间名称
   * @param {string[]} alias - 命名空间别名
   * @param {string} description - 命名空间描述
   * @param {Map<string, string>} aliasMap - 角色能力字段映射表
   * @param {Map<string, (ability: RoleAbility) => { type: string; value: string | number }>} dependentValueMap - 因变量映射表，存储因变量字段名与其方程的映射
   */
  constructor(id: number, name: string, alias: string[], description: string, aliasMap: Map<string, string> = new Map(), dependentValueMap: Map<string, (ability: RoleAbility) => { type: string; value: string | number }> = new Map()) {
    this.id = id;
    this.name = name;
    this.alias = alias;
    this.description = description;
    this.cmdMap = new Map();
    this.aliasMap = aliasMap;
    this.dependentValueMap = dependentValueMap;
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
   * @returns {string[]} 命令信息数组
   */
  getCmdList(): Map<string, CommandInfo> {
    const cmdList = new Map<string, CommandInfo>();
    Array.from(this.cmdMap.keys()).forEach((cmd) => {
      cmdList.set(cmd, this.getCmd(cmd)!);
    });
    return cmdList;
  }

  /**
   * 执行命令
   * @param {string} name - 命令名称或别名
   * @param {string[]} args - 命令参数数组
   * @param {UserRole[]} mentioned - At列表信息数组
   * @param {CPI} cpi -CmdPre接口对象
   * @returns {boolean} 命令执行结果
   * @throws {Error} 当命令不存在时抛出错误
   */
  execute(name: string, args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> {
    const cmd = this.cmdMap.get(name);
    if (cmd) {
      return cmd.solve(args, mentioned, cpi);
    }
    throw new Error(`${this.name}指令集中没有名为${name}的指令`);
  }

  /**
   * 获取因变量值
   * @param key - 因变量字段名
   * @param ability - 角色能力对象
   * @returns {string | number} 因变量值
   */
  getDependentValue(key: string, ability: RoleAbility): { type: string; value: string | number } | undefined {
    return this.dependentValueMap.get(key)?.(ability);
  }
}

/**
 * 命令执行器类，封装命令信息和执行逻辑
 *
 * @property {CommandInfo} cmdInfo - 命令的元信息
 * @property {Function} solve - 命令执行函数，接收参数数组并返回执行结果
 */
export class CommandExecutor {
  cmdInfo: CommandInfo;
  /**
   * 接收参数数组并返回执行结果
   * @param {string[]} args - 命令参数数组
   * @param {UserRole[]} mentioned - At列表信息数组,顺序为被At的顺序加上命令发送者，直接反应代骰优先级，操作时取最前面所需操作数个元素即可
   * @param {CPI} cpi -CmdPre接口对象，包含发送角色和读取数据表的方法。
   * @param {ExecutorProp} prop - 从聊天室获取的原始信息记录
   * @returns {boolean} 命令执行结果
   */
  solve: (args: string[], mentioned: UserRole[], cpi: CPI) => Promise<boolean>;

  /**
   * 构造函数
   * @param {string} name - 命令名称
   * @param {string[]} alias - 命令别名数组
   * @param {string} description - 命令描述
   * @param {string[]} examples - 使用示例数组
   * @param {string} usage - 用法说明
   * @param {Function} solve - 命令执行函数
   */
  constructor(name: string, alias: string[], description: string, examples: string[], usage: string, solve: (args: string[], mentioned: UserRole[], cpi: CPI) => boolean | Promise<boolean>) {
    this.cmdInfo = { name, alias, description, examples, usage };
    this.solve = (args, mentioned, cpi) => Promise.resolve(solve(args, mentioned, cpi));
  }
}
