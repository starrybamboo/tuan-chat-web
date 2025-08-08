import type { ExecutorProp } from "@/components/common/dicer/cmdPre";

interface RoleAbility { // eslint-disable-line ts/consistent-type-definitions
  abilityId?: number;
  roleId?: number;
  ruleId?: number;
  act?: Record<string, string>;
  ability?: Record<string, number>;
}

interface UserRole { // eslint-disable-line ts/consistent-type-definitions
  userId: number;
  roleId: number;
  roleName?: string;
  description?: string;
  avatarId?: number;
  state?: number;
  modelName?: string;
  speakerName?: string;
  createTime?: string;
  updateTime?: string;
}

interface CommandInfo { // eslint-disable-line ts/consistent-type-definitions
  name: string;
  alias: string[];
  description: string;
  examples: string[];
  usage: string;
}

interface CPI { // eslint-disable-line ts/consistent-type-definitions
  // 发送消息
  sendMsg: (prop: ExecutorProp, msg: string) => void;
  // 获取角色能力列表
  getRoleAbilityList: (roleId: number) => Promise<RoleAbility>;
  // 设置角色能力列表
  setRoleAbilityList: (roleId: number, ability: RoleAbility) => Promise<void>;
  // 发送Toast消息
  sendToast: (msg: string) => void;
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
   * @param {UserRole[]} mentioned - At列表信息数组
   * @param {CPI} cpi -CmdPre接口对象
   * @param {ExecutorProp} prop - 从聊天室获取的原始信息记录
   * @returns {boolean} 命令执行结果
   * @throws {Error} 当命令不存在时抛出错误
   */
  execute(name: string, args: string[], mentioned: UserRole[], cpi: CPI, prop: ExecutorProp): Promise<boolean> {
    const cmd = this.cmdMap.get(name);
    if (cmd) {
      return cmd.solve(args, mentioned, cpi, prop);
    }
    throw new Error(`Command ${name} not found in rule ${this.name}`);
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
  solve: (args: string[], mentioned: UserRole[], cpi: CPI, prop: ExecutorProp) => Promise<boolean>;

  /**
   * 构造函数
   * @param {string} name - 命令名称
   * @param {string[]} alias - 命令别名数组
   * @param {string} description - 命令描述
   * @param {string[]} examples - 使用示例数组
   * @param {string} usage - 用法说明
   * @param {Function} solve - 命令执行函数
   */
  constructor(name: string, alias: string[], description: string, examples: string[], usage: string, solve: (args: string[], mentioned: UserRole[], cpi: CPI, prop: ExecutorProp) => boolean | Promise<boolean>) {
    this.cmdInfo = { name, alias, description, examples, usage };
    this.solve = (args, mentioned, cpi, prop) => Promise.resolve(solve(args, mentioned, cpi, prop));
  }
}
